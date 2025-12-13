const Loan = require("../models/loans.model");
const Borrower = require("../models/borrower.model");
const FraudAlert = require("../models/fraudAlert.model");
const { createNotification } = require("./notification.service");

// Simple helper to create alert + notify merchant for medium/high
async function createFraudAlert({ BID, MID, LID, type, severity, title, message, details }) {
  const alert = await FraudAlert.create({
    BID,
    MID,
    LID,
    type,
    severity,
    title,
    message,
    details: details || {},
  });

  // Notify merchant for medium/high alerts
  if (severity === "medium" || severity === "high") {
    await createNotification({
      targetType: "merchant",
      MID,
      BID,
      LID,
      type: "info",
      title: `Fraud Alert: ${title}`,
      message,
    });
  }

  return alert;
}

/**
 * Run fraud checks whenever a new loan is created.
 * Returns list of created alerts.
 */
async function runLoanFraudChecks(loan) {
  const BID = loan.BID;
  const MID = loan.MID;
  const LID = loan.LID;

  const alerts = [];

  const borrower = await Borrower.findOne({ BID });
  if (!borrower) return alerts;

  // 1) Count active loans for this borrower (all merchants)
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
        message: `Borrower BID ${BID} has ${totalActive} active loans.`,
        details: { totalActive },
      })
    );
  } else if (totalActive > 1) {
    alerts.push(
      await createFraudAlert({
        BID,
        MID,
        LID,
        type: "too_many_active_loans",
        severity: "medium",
        title: "Multiple Active Loans",
        message: `Borrower BID ${BID} has ${totalActive} active loans.`,
        details: { totalActive },
      })
    );
  }

  // 2) Active loans with OTHER merchants
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
        message: `Borrower BID ${BID} has active loans with ${activeOtherMerchants} other merchant(s).`,
        details: { activeOtherMerchants },
      })
    );
  }

  // 3) Overdue loans check (simple logic: createdAt + loanDurationDays < now)
  const now = new Date();
  let overdueCount = 0;

  activeLoans.forEach((l) => {
    const dueDate = new Date(
      l.createdAt.getTime() +
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
        message: `Borrower BID ${BID} has ${overdueCount} overdue active loan(s).`,
        details: { overdueCount },
      })
    );
  }

  // 4) Adjust trustScore based on alerts
  if (alerts.length > 0) {
    let penalty = 0;
    alerts.forEach((a) => {
      if (a.severity === "high") penalty += 25;
      else if (a.severity === "medium") penalty += 10;
      else penalty += 5;
    });

    let newTrust = (borrower.trustScore || 100) - penalty;
    if (newTrust < 0) newTrust = 0;

    borrower.trustScore = newTrust;
    await borrower.save();

    // If trust score very low, create extra alert
    if (newTrust < 50) {
      const lowTrustAlert = await createFraudAlert({
        BID,
        MID,
        LID,
        type: "low_trust_score",
        severity: "high",
        title: "Low Trust Score",
        message: `Borrower BID ${BID} now has low trust score (${newTrust}).`,
        details: { trustScore: newTrust },
      });
      alerts.push(lowTrustAlert);
    }
  }

  return alerts;
}

/**
 * Get fraud summary for a borrower
 */
async function getBorrowerFraudSummary(BID) {
  const borrower = await Borrower.findOne({ BID }).lean();
  if (!borrower) return null;

  const alerts = await FraudAlert.find({ BID })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unresolvedCount = alerts.filter((a) => !a.isResolved).length;

  return {
    borrower,
    trustScore: borrower.trustScore,
    totalAlerts: alerts.length,
    unresolvedAlerts: unresolvedCount,
    alerts,
  };
}

module.exports = {
  runLoanFraudChecks,
  getBorrowerFraudSummary,
};
