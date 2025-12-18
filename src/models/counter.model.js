const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    // Example values:
    // "merchantMID", "borrowerBID", "loanLID", "transactionTID"
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "seq_counters",
    timestamps: false,
  }
);

// Prevent model overwrite in dev (nodemon)
const Counter =
  mongoose.models.SeqCounter ||
  mongoose.model("SeqCounter", counterSchema);

module.exports = Counter;
