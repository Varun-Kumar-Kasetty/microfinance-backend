const mongoose = require("mongoose");
const Counter = require("./counter.model"); // shared seq_counters

const loanSchema = new mongoose.Schema(
  {
    LID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Borrower BID (FK)
    BID: {
      type: Number,
      ref: "Borrower",
      required: true,
    },

    // Merchant MID (FK) – who created the loan
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
    },

    loanAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    // duration in days
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
    },

    totalPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      default: function () {
        return new Date(
          this.createdAt.getTime() +
            this.loanDurationDays * 24 * 60 * 60 * 1000
        );
      },
    },
        // full loan due date
    nextDueDate: { type: Date },     // next EMI date
    overdueDays: { type: Number, default: 0 },
    isOverdue: { type: Boolean, default: false },

    paymentHistory: [
      {
        amount: { type: Number, required: true, min: 1 },
        paidAt: { type: Date, default: Date.now },
        note: { type: String, default: "" },
      },
    ],


    
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "loans",
    timestamps: true,
    // ⭐ IMPORTANT: include virtuals (like remainingAmount) in JSON responses
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔁 Auto-increment LID using seq_counters
loanSchema.pre("save", async function () {
  if (!this.isNew || this.LID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "loanLID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.LID = counter.seq;
});

// ⭐ VIRTUAL FIELD: remainingAmount = loanAmount - totalPaid
loanSchema.virtual("remainingAmount").get(function () {
  const paid = this.totalPaid || 0;
  const remaining = this.loanAmount - paid;
  return remaining > 0 ? remaining : 0;
});

module.exports = mongoose.model("Loan", loanSchema);
