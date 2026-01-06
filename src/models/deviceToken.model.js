const mongoose = require("mongoose");

const deviceTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // "merchant" | "borrower" | "staff"
    userType: {
      type: String,
      enum: ["merchant", "borrower", "staff"],
      required: true,
    },

    MID: {
      type: Number, // for merchant / staff
    },

    BID: {
      type: Number, // for borrower
    },

    SID: {
      type: Number, // for staff
    },

    // optional: device info
    platform: {
      type: String, // "android" | "ios" | "web"
      default: "android",
    },

    appVersion: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },

  
  {
    collection: "device_tokens",
    timestamps: true,
  }
);

module.exports = mongoose.model("DeviceToken", deviceTokenSchema);
