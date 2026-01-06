const mongoose = require("mongoose");
const Counter = require("./counter.model");
const crypto = require("crypto");

const borrowerSchema = new mongoose.Schema(
  {
    // 🔢 Internal auto-increment ID
    BID: {
      type: Number,
      unique: true,
      index: true,
    },

    // 🆔 Public Borrower ID
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

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },


    permanentQrToken: {
      type: String,
      unique: true,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: true, // borrower is verified once registered + OTP login
    },
    profilePhoto: {
      type: String,   // URL or relative path
      default: null,
    },


    qrSecret: {
      type: String,
      unique: true,
      sparse: true,
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

    aadhaarNumber: {
      type: String,
      default: null,
    },

    location: {
      type: String,
      default: "",
    },

    totalLoans: { type: Number, default: 0 },
    activeLoans: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 },

    otpCode: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
  },
  {
    collection: "borrowers",
    timestamps: true,
  }
);

/* ===============================
   UNIQUE INDEXES (IMPORTANT)
   =============================== */

// Email → unique only if provided
borrowerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

// Aadhaar → unique only if provided
borrowerSchema.index(
  { aadhaarNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { aadhaarNumber: { $type: "string" } },
  }
);

/* ===============================
   PRE-SAVE HOOK
   =============================== */
borrowerSchema.pre("save", async function () {

  if (this.isNew && !this.borrowerUID) {
    const random = crypto.randomBytes(4).toString("hex").toUpperCase();
    this.borrowerUID = `LS-BRW-${random}`;
  }

  if (this.isNew && !this.permanentQrToken) {
  const hash = crypto
    .createHash("sha256")
    .update(this.borrowerUID + process.env.QR_SECRET)
    .digest("hex")
    .substring(0, 24)
    .toUpperCase();

  this.permanentQrToken = `LSQR-${hash}`;
}


  if (this.isNew && !this.BID) {
    const counter = await Counter.findOneAndUpdate(
      { key: "borrowerBID" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.BID = counter.seq;
  }
});

module.exports = mongoose.model("Borrower", borrowerSchema);
