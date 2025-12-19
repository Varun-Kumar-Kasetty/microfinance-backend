const mongoose = require("mongoose");
const Counter = require("./counter.model");
const crypto = require("crypto");

const borrowerSchema = new mongoose.Schema(
  {
    // 🔢 Internal auto-increment ID (DO NOT expose)
    BID: {
      type: Number,
      unique: true,
      index: true,
    },

    // 🆔 Public Borrower ID (USED FOR QR & MANUAL ENTRY)
    borrowerUID: {
      type: String,
      unique: true,
      index: true,
      immutable: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 255,
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: "Phone number must be 10 digits",
      },
    },

    // FK → Merchant.MID
    VID: {
      type: Number,
      ref: "Merchant",
      required: true,
    },

    totalLoans: {
      type: Number,
      default: 0,
    },

    activeLoans: {
      type: Number,
      default: 0,
    },

    trustScore: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    location: {
      type: String,
      default: "",
    },

    // 📍 Address fields
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    state: {
      type: String,
      default: "",
    },
    pincode: {
      type: String,
      default: "",
    },

    // 🌍 Geo location
    locationGeo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },

    // 🔑 OTP login
    otpCode: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "borrowers",
    timestamps: true,
  }
);

// 🌍 Geo index
borrowerSchema.index({ locationGeo: "2dsphere" });

/**
 * 🔁 Pre-save hook
 * - Auto increment BID
 * - Generate borrowerUID once
 */
borrowerSchema.pre("save", async function (next) {
  // Generate borrowerUID (only once)
  if (this.isNew && !this.borrowerUID) {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.borrowerUID = `LS-BRW-${random}`;
  }

  // Auto-increment BID
  if (this.isNew && !this.BID) {
    const counter = await Counter.findOneAndUpdate(
      { key: "borrowerBID" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.BID = counter.seq;
  }

  next();
});

module.exports = mongoose.model("Borrower", borrowerSchema);
