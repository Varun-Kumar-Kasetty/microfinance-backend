const mongoose = require("mongoose");
const Counter = require("./counter.model");

const notificationSchema = new mongoose.Schema(
  {
    NID: {
      type: Number,
      unique: true,
      index: true,
    },

    targetType: {
      type: String,
      enum: ["merchant", "borrower"],
      required: true,
    },

    MID: {
      type: Number,
      ref: "Merchant",
    },

    BID: {
      type: Number,
      ref: "Borrower",
    },

    LID: {
      type: Number,
      ref: "Loan",
    },

    TID: {
      type: Number,
      ref: "Transaction",
    },

    // 🔔 FIXED ENUM
     type: {
      type: String,
      enum: [
        // Loans
        "loan_created",
        "loan_closed",

        // Payments
        "payment_received",
        "payment_made",

        // Trust score
        "trust_score",
        "trust_score_change",     // ✅ FIX
        "trust_score_restored",   // ✅ SAFE FOR FUTURE
        "trust_score_deducted",   // ✅ SAFE FOR FUTURE

        // Fraud / system
        "fraud_alert",
        "info",
      ],
      default: "info",
    },

    title: {
      type: String,
      required: true,
      maxLength: 200,
    },

    message: {
      type: String,
      required: true,
      maxLength: 1000,
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: "notifications",
    timestamps: true,
  }
);

// Auto-increment NID
notificationSchema.pre("save", async function () {
  if (!this.isNew || this.NID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "notificationNID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.NID = counter.seq;
});

module.exports = mongoose.model("Notification", notificationSchema);
