const cron = require("node-cron");
const Loan = require("../models/loans.model");
const Transaction = require("../models/transactions.model");
const Borrower = require("../models/borrower.model");
const { createNotification } = require("../services/notification.service");

// Helper to get start/end of today
function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function sendMerchantDailySummary() {
  try {
    console.log("Running Merchant Daily Summary Cron...");

    const { start, end } = getTodayRange();

    // 1) Get all active merchants (those who have loans or borrowers)
    const merchants = await Loan.distinct("MID");

    for (const MID of merchants) {
      const midNum = Number(MID);

      // Payments for today
      const todayPayments = await Transaction.find({
        MID: midNum,
        paidAt: { $gte: start, $lte: end },
      });

      const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);
      const todayCount = todayPayments.length;

      // Loans due today
      const dueLoans = await Loan.find({
        MID: midNum,
        status: "active",
        // Simple "due today" check
        $expr: {
          $eq: [
            {
              $dateToString: { format: "%Y-%m-%d", date: "$dueDate" },
            },
            start.toISOString().substring(0, 10),
          ],
        },
      });

      // Overdue loans
      const overdueLoans = await Loan.find({
        MID: midNum,
        status: "active",
        dueDate: { $lt: start },
      });

      // SEND NOTIFICATION
      await createNotification({
        targetType: "merchant",
        MID: midNum,
        type: "daily_summary",
        title: "Daily Summary Report",
        message: `
📅 Summary for Today:
• Collections Today: ₹${todayTotal}
• Number of Payments: ${todayCount}
• EMI Due Today: ${dueLoans.length}
• Overdue Loans: ${overdueLoans.length}
        `,
      });

      console.log(`Merchant ${MID} summary sent.`);
    }
  } catch (error) {
    console.error("Merchant Daily Summary Cron Error:", error);
  }
}

async function sendBorrowerDailyReminders() {
  try {
    console.log("Running Borrower Daily Reminder Cron...");

    const { start, end } = getTodayRange();

    // 1) Borrowers with EMI due today
    const dueLoans = await Loan.find({
      status: "active",
      $expr: {
        $eq: [
          {
            $dateToString: { format: "%Y-%m-%d", date: "$dueDate" },
          },
          start.toISOString().substring(0, 10),
        ],
      },
    });

    for (const loan of dueLoans) {
      await createNotification({
        targetType: "borrower",
        BID: loan.BID,
        MID: loan.MID,
        LID: loan.LID,
        type: "emi_due",
        title: "EMI Due Today",
        message: `Your EMI of ₹${loan.loanAmount} is due today.`,
      });
    }

    // 2) Borrowers with overdue loans
    const overdueLoans = await Loan.find({
      status: "active",
      dueDate: { $lt: start },
    });

    for (const loan of overdueLoans) {
      await createNotification({
        targetType: "borrower",
        BID: loan.BID,
        MID: loan.MID,
        LID: loan.LID,
        type: "emi_overdue",
        title: "EMI Overdue",
        message: `Your EMI for ₹${loan.loanAmount} is overdue. Please make payment.`,
      });
    }
  } catch (error) {
    console.error("Borrower Daily Reminder Cron Error:", error);
  }
}

// CRON SCHEDULE
// Runs every day at 6 AM
cron.schedule("0 6 * * *", async () => {
  console.log("Running Daily Summary Cron (6 AM)...");
  await sendMerchantDailySummary();
  await sendBorrowerDailyReminders();
});

module.exports = {
  sendMerchantDailySummary,
  sendBorrowerDailyReminders,
};
