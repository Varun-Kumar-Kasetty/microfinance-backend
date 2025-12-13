const mongoose = require("mongoose");
const Counter = require("./counter.model");

const staffSchema = new mongoose.Schema(
  {
    SID: {
      type: Number,
      unique: true,
      index: true,
    },

    // belongs to which merchant
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
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
      // You can decide if global unique or per-merchant unique.
      // For now, global unique:
      unique: true,
      validate: {
        validator: (v) => /^[0-9]{10}$/.test(v),
        message: "Phone number must be 10 digits",
      },
    },

    // role of staff inside merchant org
    role: {
      type: String,
      enum: ["collector", "manager", "viewer"],
      default: "collector",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // list of borrower BIDs assigned to this staff
    assignedBorrowers: [
      {
        type: Number, // BID
        ref: "Borrower",
      },
    ],

    // optional: specific area / zone
    area: {
      type: String,
      default: "",
    },

    // OTP fields for login
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
    collection: "staff",
    timestamps: true,
  }
);

// Auto-increment SID
staffSchema.pre("save", async function () {
  if (!this.isNew || this.SID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "staffSID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.SID = counter.seq;
});

module.exports = mongoose.model("Staff", staffSchema);
