const mongoose = require("mongoose");
const Counter = require("./counter.model");

//
// 💳 PAYMENT HISTORY SUB-SCHEMA
//
const paymentHistorySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      default: "",
    },

    // 🔥 SNAPSHOT AFTER THIS PAYMENT
    remainingAfterPayment: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

//
// 🧾 LOAN SCHEMA
//
const loanSchema = new mongoose.Schema(
  {
    // Auto-increment Loan ID
    LID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Borrower reference
    BID: {
      type: Number,
      ref: "Borrower",
      required: true,
      index: true,
    },

    // Merchant reference
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
      index: true,
    },

    loanAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    // Duration in days
    loanDurationDays: {
      type: Number,
      required: true,
      min: 1,
    },

    purpose: {
      type: String,
      default: "",
    },

    imagePath: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },

    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Calculated field (middleware)
    dueDate: {
      type: Date,
    },

    // EMI / overdue helpers
    nextDueDate: {
      type: Date,
      default: null,
    },

    overdueDays: {
      type: Number,
      default: 0,
    },

    isOverdue: {
      type: Boolean,
      default: false,
    },

    // 💳 PAYMENT HISTORY (ORDER MATTERS)
    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },

    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "loans",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//
// 🔁 AUTO-INCREMENT LID
//
loanSchema.pre("save", async function () {
  if (!this.isNew || this.LID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "loanLID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.LID = counter.seq;
});

//
// 📅 CALCULATE DUE DATE SAFELY
//
loanSchema.pre("save", function () {
  const baseDate = this.createdAt || new Date();
  const durationDays = this.loanDurationDays || 0;

  this.dueDate = new Date(
    baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000
  );
});

//
// ⭐ VIRTUAL: remainingAmount (SAFE)
//
loanSchema.virtual("remainingAmount").get(function () {
  const paid = this.totalPaid || 0;
  const remaining = this.loanAmount - paid;
  return remaining > 0 ? remaining : 0;
});

//
// ⭐ VIRTUAL: paidPercentage (SAFE)
//
loanSchema.virtual("paidPercentage").get(function () {
  if (!this.loanAmount || this.loanAmount <= 0) return 0;

  return Math.min(
    100,
    Math.round((this.totalPaid / this.loanAmount) * 100)
  );
});

module.exports = mongoose.model("Loan", loanSchema);
