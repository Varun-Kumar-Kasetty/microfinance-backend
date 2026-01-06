const Activity = require("../models/Activity");
const Borrower = require("../models/borrower.model");
const { createNotification } = require("../services/notification.service");

/**
 * Centralized Activity Logger
 * - Saves activity
 * - Auto-creates notifications (merchant / borrower)
 */
async function logActivity({
  merchantId,
  borrowerId = null,
  loanId = null,
  borrowerName = null,
  type,
  amount = 0,
  description = "",
  notifyMerchant = false,
  notifyBorrower = false,
}) {
  try {
    // ================= BORROWER NAME SAFETY =================
    let resolvedBorrowerName = borrowerName;

    if (!resolvedBorrowerName && borrowerId) {
      const borrower = await Borrower.findOne(
        { BID: borrowerId },
        { fullName: 1 }
      ).lean();

      resolvedBorrowerName = borrower?.fullName || "Borrower";
    }

    // ================= SAVE ACTIVITY =================
    const activity = await Activity.create({
      merchantId,
      borrowerId,
      loanId,
      borrowerName: resolvedBorrowerName,
      type,
      amount,
      description,
      notifyMerchant,
      notifyBorrower,
    });

    const notificationType = mapActivityToNotificationType(type);

    // ================= NOTIFY MERCHANT =================
    if (notifyMerchant && merchantId) {
      await createNotification({
        targetType: "merchant",
        MID: merchantId,
        BID: borrowerId,
        LID: loanId,
        type: notificationType,
        title: getMerchantTitle(type),
        message: getMerchantMessage({
          type,
          borrowerName: resolvedBorrowerName,
          amount,
          loanId,
        }),
      });
    }

    // ================= NOTIFY BORROWER =================
    if (notifyBorrower && borrowerId) {
      await createNotification({
        targetType: "borrower",
        BID: borrowerId,
        MID: merchantId,
        LID: loanId,
        type: notificationType,
        title: getBorrowerTitle(type),
        message: getBorrowerMessage({
          type,
          amount,
          loanId,
        }),
      });
    }

    return activity;
  } catch (error) {
    // 🚨 Never break business flow
    console.error("Activity Logger Error:", error.message);
    return null;
  }
}

/* =====================================================
   ACTIVITY → NOTIFICATION TYPE MAPPER
   ===================================================== */

function mapActivityToNotificationType(activityType) {
  switch (activityType) {
    case "LOAN_CREATED":
      return "loan_created";

    case "REPAYMENT":
      return "payment_received";

    case "LOAN_CLOSED":
      return "loan_closed";

    case "TRUST_SCORE_CHANGE":
    case "TRUST_SCORE_RESTORED":
    case "TRUST_SCORE_DEDUCTED":
      return "trust_score";

    case "FRAUD_ALERT":
      return "fraud_alert";

    default:
      return "info";
  }
}

/* =====================================================
   TITLE + MESSAGE HELPERS
   ===================================================== */

function getMerchantTitle(type) {
  switch (type) {
    case "LOAN_CREATED":
      return "New Loan Created";
    case "REPAYMENT":
      return "Loan Repayment Received 💰";
    case "LOAN_CLOSED":
      return "Loan Closed";
    case "FRAUD_ALERT":
      return "⚠️ Fraud Alert";
    default:
      return "LendSafe Update";
  }
}

function getMerchantMessage({ type, borrowerName, amount, loanId }) {
  switch (type) {
    case "LOAN_CREATED":
      return `Loan created for ${borrowerName}.`;
    case "REPAYMENT":
      return `${borrowerName} paid ₹${amount} towards loan ${loanId}.`;
    case "LOAN_CLOSED":
      return `Loan ${loanId} has been fully closed.`;
    case "FRAUD_ALERT":
      return `Suspicious activity detected for ${borrowerName}.`;
    default:
      return "You have a new update.";
  }
}

function getBorrowerTitle(type) {
  switch (type) {
    case "LOAN_CREATED":
      return "Loan Created";
    case "REPAYMENT":
      return "Payment Recorded";
    case "LOAN_CLOSED":
      return "Loan Closed 🎉";
    default:
      return "Account Update";
  }
}

function getBorrowerMessage({ type, amount, loanId }) {
  switch (type) {
    case "LOAN_CREATED":
      return `Your loan ${loanId} has been created.`;
    case "REPAYMENT":
      return `Your payment of ₹${amount} was received.`;
    case "LOAN_CLOSED":
      return `Your loan ${loanId} is fully repaid.`;
    default:
      return "Your account has been updated.";
  }
}

module.exports = { logActivity };
