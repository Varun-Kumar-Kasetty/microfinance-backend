const mongoose = require("mongoose");
const Counter = require("./counter.model");

const transactionSchema = new mongoose.Schema(
  {
    // Auto-increment Transaction ID
    TID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Loan reference
    LID: {
      type: Number,
      required: true,
      index: true,
    },

    // Borrower reference
    BID: {
      type: Number,
      required: true,
      index: true,
    },

    // Merchant reference
    MID: {
      type: Number,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    method: {
      type: String,
      enum: ["cash", "upi", "bank"],
      default: "cash",
    },

    note: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // 🔥 SNAPSHOT: remaining balance AFTER this payment
    remainingAfterPayment: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "transactions",
    timestamps: true,
  }
);

//
// 🔁 AUTO-INCREMENT TID
//
transactionSchema.pre("save", async function () {
  if (!this.isNew || this.TID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "transactionTID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.TID = counter.seq;
});

module.exports = mongoose.model("Transaction", transactionSchema);
