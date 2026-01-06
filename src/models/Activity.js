const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    // ================= CORE =================
    merchantId: {
      type: Number,          // MID
      required: true,
      index: true,
    },

    borrowerId: {
      type: Number,          // BID
      index: true,
      default: null,
    },

    loanId: {
      type: Number,          // LID
      index: true,
      default: null,
    },

    borrowerName: {
      type: String,
      default: null,
    },

    // ================= TYPE =================
    type: {
      type: String,
      enum: [
        "LOAN_CREATED",
        "REPAYMENT",
        "LOAN_CLOSED",
        "FRAUD_ALERT",
        "TRUST_SCORE_CHANGE",
        "TRUST_SCORE_RESTORED",  
        "TRUST_SCORE_DEDUCTED",  
        "TRUST_SCORE",
      ],
      required: true,
    },

    // ================= DETAILS =================
    amount: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      default: "",
    },

    // ================= NOTIFICATION FLAGS =================
    notifyMerchant: {
      type: Boolean,
      default: false,
    },

    notifyBorrower: {
      type: Boolean,
      default: false,
    },

    // ================= STATUS =================
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Activity", activitySchema);
