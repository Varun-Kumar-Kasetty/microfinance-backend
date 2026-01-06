const Loan = require("../models/loans.model");
const TrustScoreEvent = require("../models/trustScoreEvent.model");
const Notification = require("../models/notifications.model");

module.exports = async function () {
  return; // ❌ deprecated – replaced by missedDueDate.cron.js
};


module.exports = async function checkMissedDueDate() {
  const overdueLoans = await Loan.find({
    status: "active",
    dueDate: { $lt: new Date() },
  });

  for (const loan of overdueLoans) {
    const alreadyPenalized = await TrustScoreEvent.findOne({
      loanId: loan.loanId,
      eventType: "MISSED_DUE_DATE",
    });

    if (alreadyPenalized) continue;

    await TrustScoreEvent.create({
      BID: loan.BID,
      loanId: loan.loanId,
      eventType: "MISSED_DUE_DATE",
      points: -2,
      description: "Missed due date penalty.",
    });

    await Notification.create({
      targetType: "borrower",
      BID: loan.BID,
      title: "Payment Overdue ⚠️",
      message:
        "Your loan payment is overdue. Pay now to avoid weekly penalties and gain 1–10 trust points.",
    });
  }
};
