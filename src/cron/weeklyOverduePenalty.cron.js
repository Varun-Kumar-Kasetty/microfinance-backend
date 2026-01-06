// src/cron/weeklyOverduePenalty.cron.js

const Loan = require("../models/loans.model");
const TrustScoreEvent = require("../models/trustScoreEvent.model");
const { addTrustScoreEvent } = require("../services/trustScore.service");
const { createNotification } = require("../services/notification.service");

module.exports = async function weeklyOverduePenaltyCron() {
  const now = new Date();

  const overdueLoans = await Loan.find({
    status: "active",
    dueDate: { $lt: now },
  });

  for (const loan of overdueLoans) {
    const daysOverdue = Math.floor(
      (now - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue < 7) continue;

    const weeksOverdue = Math.floor(daysOverdue / 7);

    const penaltiesGiven = await TrustScoreEvent.countDocuments({
      loanId: loan.LID,
      eventType: "WEEKLY_OVERDUE",
    });

    if (weeksOverdue <= penaltiesGiven) continue;

    await addTrustScoreEvent({
      BID: loan.BID,
      loanId: loan.LID,
      eventType: "WEEKLY_OVERDUE",
      points: -2,
      description: "Weekly overdue penalty applied.",
    });

    await createNotification({
      targetType: "borrower",
      BID: loan.BID,
      MID: loan.MID,
      LID: loan.LID,
      type: "trust_score",
      title: "Weekly Penalty Applied",
      message:
        "Another week overdue. Pay now to stop further penalties.",
    });
  }
};
