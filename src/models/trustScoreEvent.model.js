// src/models/trustScoreEvent.model.js
const mongoose = require("mongoose");

const trustScoreEventSchema = new mongoose.Schema(
  {
    BID: { type: Number, required: true },
    loanId: { type: String },
    eventType: {
      type: String,
      enum: [
        "LOAN_TAKEN",
        "ON_TIME_PAYMENT",
        "MISSED_DUE_DATE",
        "WEEKLY_OVERDUE",
        "LATE_PAYMENT_RECOVERY",
      ],
      required: true,
    },
    points: { type: Number, required: true }, // + or -
    description: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "TrustScoreEvent",
  trustScoreEventSchema
);
