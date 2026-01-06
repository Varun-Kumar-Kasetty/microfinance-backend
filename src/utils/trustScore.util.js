// src/utils/trustScore.util.js
const TrustScoreEvent = require("../models/trustScoreEvent.model");

const MAX_SCORE = 100;
const MIN_SCORE = 0;

exports.calculateTrustScore = async (BID, baseScore = 100) => {
  const events = await TrustScoreEvent.find({ BID }).lean();

  let score = baseScore;

  for (const e of events) {
    score += e.points;
  }

  if (score > MAX_SCORE) score = MAX_SCORE;
  if (score < MIN_SCORE) score = MIN_SCORE;

  return score;
};
