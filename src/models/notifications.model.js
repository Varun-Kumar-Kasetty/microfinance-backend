const mongoose = require("mongoose");
const Counter = require("./counter.model");

const notificationSchema = new mongoose.Schema(
  {
    NID: {
      type: Number,
      unique: true,
      index: true,
    },

    // who is this for?
    targetType: {
      type: String,
      enum: ["merchant", "borrower"],
      required: true,
    },

    MID: {
      type: Number, // for merchant notifications
      ref: "Merchant",
    },

    BID: {
      type: Number, // for borrower notifications
      ref: "Borrower",
    },

    LID: {
      type: Number, // optional: related loan
      ref: "Loan",
    },

    TID: {
      type: Number, // optional: related transaction
      ref: "Transaction",
    },

    type: {
      type: String,
      enum: ["loan_created", "payment_received", "payment_made", "info"],
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
    timestamps: true, // createdAt = notification time
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
