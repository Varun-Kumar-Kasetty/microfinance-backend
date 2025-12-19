const mongoose = require("mongoose");
const Counter = require("./counter.model");

const borrowerSchema = new mongoose.Schema(
  {
    BID: {
      type: Number,
      unique: true,
      index: true,
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

    // ✅ GEO FIELDS
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

    // 🔑 OTP login fields
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

// Geo index
borrowerSchema.index({ locationGeo: "2dsphere" });

// 🔁 Auto-increment BID using seq_counters
borrowerSchema.pre("save", async function () {
  if (!this.isNew || this.BID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "borrowerBID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.BID = counter.seq;
});

module.exports = mongoose.model("Borrower", borrowerSchema);
