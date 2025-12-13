const mongoose = require("mongoose");
const Counter = require("./counter.model");

const fraudAlertSchema = new mongoose.Schema(
  {
    FAID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Borrower involved
    BID: {
      type: Number,
      ref: "Borrower",
      required: true,
    },

    // Merchant who should see this
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
    },

    // Optional related loan
    LID: {
      type: Number,
      ref: "Loan",
    },

    // Type of risk
    type: {
      type: String,
      enum: [
        "too_many_active_loans",
        "multi_merchant_borrowing",
        "overdue_loans",
        "low_trust_score",
        "manual_flag",
      ],
      required: true,
    },

    // Severity
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
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

    // Any extra data
    details: {
      type: Object,
      default: {},
    },

    isResolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "fraud_alerts",
    timestamps: true,
  }
);

// Auto-increment FAID
fraudAlertSchema.pre("save", async function () {
  if (!this.isNew || this.FAID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "fraudFAID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.FAID = counter.seq;
});

module.exports = mongoose.model("FraudAlert", fraudAlertSchema);
