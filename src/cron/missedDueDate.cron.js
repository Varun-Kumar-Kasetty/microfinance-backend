// src/cron/missedDueDate.cron.js

const Loan = require("../models/loans.model");
const { addTrustScoreEvent } = require("../services/trustScore.service");
const TrustScoreEvent = require("../models/trustScoreEvent.model");
const { createNotification } = require("../services/notification.service");

module.exports = async function missedDueDateCron() {
  const now = new Date();

  const overdueLoans = await Loan.find({
    status: "active",
    dueDate: { $lt: now },
  });

  for (const loan of overdueLoans) {
    // ✅ Apply MISSED_DUE_DATE only once per loan
    const alreadyApplied = await TrustScoreEvent.findOne({
      loanId: loan.LID,
      eventType: "MISSED_DUE_DATE",
    });

    if (alreadyApplied) continue;

    await addTrustScoreEvent({
      BID: loan.BID,
      loanId: loan.LID,
      eventType: "MISSED_DUE_DATE",
      points: -2,
      description: "Payment missed on due date.",
    });

    await createNotification({
      targetType: "borrower",
      BID: loan.BID,
      MID: loan.MID,
      LID: loan.LID,
      type: "trust_score",
      title: "Payment Overdue ⚠️",
      message:
        "Your loan payment is overdue. Pay now to avoid weekly penalties.",
    });
  }
};
