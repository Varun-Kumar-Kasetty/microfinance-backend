const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    merchantId: {
      type: Number,          // MID from JWT
      required: true,
      index: true
    },

    borrowerName: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["LOAN_CREATED", "REPAYMENT", "LOAN_CLOSED"],
      required: true
    },

    amount: {
      type: Number,
      default: 0
    },

    description: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Activity", activitySchema);
