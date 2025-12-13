const mongoose = require("mongoose");
const Counter = require("./counter.model"); // shared seq_counters

const communityPostSchema = new mongoose.Schema(
  {
    PID: {
      type: Number,
      unique: true,
      index: true,
    },

    // Which merchant posted this
    MID: {
      type: Number,
      ref: "Merchant",
      required: true,
    },

    // 'fraud' | 'success' | 'general'
    postType: {
      type: String,
      enum: ["fraud", "success", "general"],
      default: "general",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 4000,
    },

    region: {
      type: String, // e.g. "Mumbai Central"
      default: "",
    },

    attachments: [
      {
        type: String, // image path / URL
      },
    ],

    likesCount: {
      type: Number,
      default: 0,
    },

    comments: [
      {
        MID: { type: Number, ref: "Merchant", required: true },
        text: { type: String, required: true, trim: true, maxLength: 1000 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    commentsCount: {
      type: Number,
      default: 0,
    },

    // ✅ GEO: where this incident happened
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
    collection: "community_posts",
    timestamps: true,
  }
);

// Auto-increment PID
communityPostSchema.pre("save", async function () {
  if (!this.isNew || this.PID) return;

  const counter = await Counter.findOneAndUpdate(
    { key: "communityPID" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  this.PID = counter.seq;
});

// Geo index for nearby fraud alerts
communityPostSchema.index({ locationGeo: "2dsphere" });

module.exports = mongoose.model("CommunityPost", communityPostSchema);
