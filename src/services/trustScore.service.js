// src/services/trustScore.service.js

const Borrower = require("../models/borrower.model");
const TrustScoreEvent = require("../models/trustScoreEvent.model");

const BASE_TRUST_SCORE = 100;

/**
 * Recalculate and sync trust score for a borrower
 * Source of truth: TrustScoreEvent
 */
async function recalculateTrustScore(BID) {
  if (!BID) return null;

  // 1️⃣ Sum all trust score events
  const agg = await TrustScoreEvent.aggregate([
    { $match: { BID: Number(BID) } },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: "$points" },
      },
    },
  ]);

  const delta = agg.length ? agg[0].totalPoints : 0;
  let finalScore = BASE_TRUST_SCORE + delta;

  // 2️⃣ Clamp score (safety)
  if (finalScore < 0) finalScore = 0;
  if (finalScore > 100) finalScore = 100;

  // 3️⃣ Sync to borrower cache
  await Borrower.updateOne(
    { BID: Number(BID) },
    { $set: { trustScore: finalScore } }
  );

  return finalScore;
}

/**
 * Helper to create trust score event + auto-sync
 */
async function addTrustScoreEvent({
  BID,
  loanId,
  eventType,
  points,
  description,
}) {
  if (!BID || !eventType || !points) return null;

  await TrustScoreEvent.create({
    BID: Number(BID),
    loanId,
    eventType,
    points,
    description,
  });

  return await recalculateTrustScore(BID);
}

module.exports = {
  recalculateTrustScore,
  addTrustScoreEvent,
};
