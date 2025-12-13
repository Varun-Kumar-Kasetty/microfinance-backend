// src/models/counter.model.js
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "merchantMID", "borrowerBID"
    seq: { type: Number, default: 0 },
  },
  { collection: "seq_counters" } // <── NEW COLLECTION NAME (no conflict)
);

const Counter =
  mongoose.models.SeqCounter || mongoose.model("SeqCounter", counterSchema);

module.exports = Counter;
