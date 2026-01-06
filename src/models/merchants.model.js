const mongoose = require("mongoose");
const Counter = require("./counter.model");

const merchantSchema = new mongoose.Schema(
  {
    MID: {
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

    storeName: {
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

    email: {
      type: String,
      required: true,
      unique: true,
      maxLength: 255,
      match: /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/,
    },
    tempEmail: {
      type: String,
      default: null,
    },


    address: {
      type: String,
      maxLength: 255,
    },

    GSTIN: {
      type: String,
      required: true,
      unique: true,
      maxLength: 15,
    },

    imagePath: {
      type: String,
    },
    otpCode: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },

    // ✅ GST verification info
    gstVerified: {
      type: Boolean,
      default: false,
    },
    gstLegalName: {
      type: String,
      default: null,
    },
    gstTradeName: {
      type: String,
      default: null,
    },
    gstStateCode: {
      type: String,
      default: null,
    },
    gstStatus: {
      type: String,
      default: null,
    },

    // ✅ GEO FIELDS
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
  },
  {
    collection: "merchants",
    timestamps: true,
  }
);

// Geo index
merchantSchema.index({ locationGeo: "2dsphere" });

// 🔁 Auto-increment MID using seq_counters
merchantSchema.pre("save", async function () {
  if (!this.isNew || this.MID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "merchantMID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.MID = counter.seq;
});

module.exports = mongoose.model("Merchant", merchantSchema);
