const mongoose = require("mongoose");
const Counter = require("./counter.model");

const transactionSchema = new mongoose.Schema(
  {
    TID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Loan reference
    LID: {
      type: Number,
      ref: "Loan",
      required: true,
    },

    // Borrower reference
    BID: {
      type: Number,
      ref: "Borrower",
      required: true,
    },

    // Merchant reference
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    // e.g. cash / upi / bank / other (optional)
    method: {
      type: String,
      enum: ["cash", "upi", "bank", "other"],
      default: "cash",
    },

    note: {
      type: String,
      default: "",
      maxLength: 1000,
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "transactions",
    timestamps: true,
  }
);

// Auto-increment TID
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
