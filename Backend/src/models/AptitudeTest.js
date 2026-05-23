const mongoose = require("mongoose");

const aptitudeTestSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
    },
    title: { type: String, required: true },
    description: { type: String },
    instructions: { type: String },
    questionCount: { type: Number, default: 20 },
    duration: { type: Number, required: true }, // in minutes
    categories: [{ type: String, enum: ["numerical", "verbal", "logical", "situational"] }],
    difficultyMix: {
      easy: { type: Number, default: 30 },
      medium: { type: Number, default: 50 },
      hard: { type: Number, default: 20 },
    },
    shareCode: { type: String, unique: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    isActive: { type: Boolean, default: true },
    deadline: { type: Date },
    maxAttempts: { type: Number, default: 1 },
    proctoringEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AptitudeTest", aptitudeTestSchema);
