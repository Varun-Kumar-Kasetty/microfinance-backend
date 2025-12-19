const mongoose = require("mongoose");

const borrowerQrTokenSchema = new mongoose.Schema(
  {
    borrowerUID: {
      type: String,
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongo auto-delete
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "borrower_qr_tokens",
  }
);

module.exports = mongoose.model("BorrowerQrToken", borrowerQrTokenSchema);
