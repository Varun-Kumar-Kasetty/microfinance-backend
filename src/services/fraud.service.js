const Loan = require("../models/loans.model");
const Borrower = require("../models/borrower.model");
const FraudAlert = require("../models/fraudAlert.model");
const { logActivity } = require("../utils/activityLogger");

/**
 * Create fraud alert + log activity
 */
async function createFraudAlert({
  BID,
  MID,
  LID,
  type,
  severity,
  title,
  message,
  details = {},
}) {
  const alert = await FraudAlert.create({
    BID,
    MID,
    LID,
    type,
    severity,
    title,
    message,
    details,
  });

  // 🔔 Notify merchant ONLY for medium / high
  if (severity === "medium" || severity === "high") {
    await logActivity({
      merchantId: MID,
      borrowerId: BID,
      loanId: LID,
      type: "FRAUD_ALERT",
      amount: 0,
      description: title,
      notifyMerchant: true,
      notifyBorrower: false,
    });
  }

  return alert;
}

/**
 * Run fraud checks when loan is created
 */
async function runLoanFraudChecks(loan) {
  const BID = loan.BID;
  const MID = loan.MID;
  const LID = loan.LID;

  const alerts = [];

  const borrower = await Borrower.findOne({ BID });
  if (!borrower) return alerts;

  // ===============================
  // 1️⃣ TOO MANY ACTIVE LOANS
  // ===============================
  const activeLoans = await Loan.find({
    BID,
    status: "active",
  }).lean();

  const totalActive = activeLoans.length;

  if (totalActive > 3) {
    alerts.push(
      await createFraudAlert({
        BID,
        MID,
        LID,
        type: "too_many_active_loans",
        severity: "high",
        title: "Too Many Active Loans",
        message: `Borrower has ${totalActive} active loans`,
        details: { totalActive },
      })
    );
  } else if (totalActive > 1) {
    alerts.push(
      await createFraudAlert({
        BID,
        MID,
        LID,
        type: "multiple_active_loans",
        severity: "medium",
        title: "Multiple Active Loans",
        message: `Borrower has ${totalActive} active loans`,
        details: { totalActive },
      })
    );
  }

  // ===============================
  // 2️⃣ MULTI-MERCHANT BORROWING
  // ===============================
  const activeOtherMerchants = activeLoans.filter(
    (l) => l.MID !== MID
  ).length;

  if (activeOtherMerchants > 0) {
    alerts.push(
      await createFraudAlert({
        BID,
        MID,
        LID,
        type: "multi_merchant_borrowing",
        severity: activeOtherMerchants > 1 ? "high" : "medium",
        title: "Borrowing From Multiple Merchants",
        message: `Borrower has loans with ${activeOtherMerchants} other merchant(s)`,
        details: { activeOtherMerchants },
      })
    );
  }

  // ===============================
  // 3️⃣ OVERDUE LOANS
  // ===============================
  const now = new Date();
  let overdueCount = 0;

  activeLoans.forEach((l) => {
    if (!l.createdAt || !l.loanDurationDays) return;

    const dueDate = new Date(
      new Date(l.createdAt).getTime() +
        l.loanDurationDays * 24 * 60 * 60 * 1000
    );

    if (dueDate < now) overdueCount += 1;
  });

  if (overdueCount > 0) {
    alerts.push(
      await createFraudAlert({
        BID,
        MID,
        LID,
        type: "overdue_loans",
        severity: overdueCount > 1 ? "high" : "medium",
        title: "Overdue Loans Detected",
        message: `Borrower has ${overdueCount} overdue loan(s)`,
        details: { overdueCount },
      })
    );
  }

  // ===============================
  // 4️⃣ TRUST SCORE PENALTY
  // ===============================
  if (alerts.length > 0) {
    let penalty = 0;

    alerts.forEach((a) => {
      if (a.severity === "high") penalty += 25;
      else if (a.severity === "medium") penalty += 10;
      else penalty += 5;
    });

    borrower.trustScore = Math.max((borrower.trustScore || 100) - penalty, 0);
    await borrower.save();

    // 🔔 Notify borrower about trust score drop
    await logActivity({
      merchantId: MID,
      borrowerId: BID,
      loanId: LID,
      type: "TRUST_SCORE_CHANGE",
      amount: -penalty,
      description: `Trust score reduced by ${penalty}`,
      notifyMerchant: false,
      notifyBorrower: true,
    });

    // EXTRA alert if trust score critical
    if (borrower.trustScore < 50) {
      alerts.push(
        await createFraudAlert({
          BID,
          MID,
          LID,
          type: "low_trust_score",
          severity: "high",
          title: "Low Trust Score",
          message: `Borrower trust score dropped to ${borrower.trustScore}`,
          details: { trustScore: borrower.trustScore },
        })
      );
    }
  }

  return alerts;
}

/**
 * Borrower fraud summary
 */
async function getBorrowerFraudSummary(BID) {
  const borrower = await Borrower.findOne({ BID }).lean();
  if (!borrower) return null;

  const alerts = await FraudAlert.find({ BID })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return {
    borrower,
    trustScore: borrower.trustScore,
    totalAlerts: alerts.length,
    unresolvedAlerts: alerts.filter((a) => !a.isResolved).length,
    alerts,
  };
}

module.exports = {
  runLoanFraudChecks,
  getBorrowerFraudSummary,
};
