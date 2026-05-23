const mongoose = require("mongoose");

const aptitudeAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AptitudeTest",
      required: false,
    },
    guestEmail: { type: String },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion" },
        selectedOptionId: { type: mongoose.Schema.Types.ObjectId },
        isCorrect: { type: Boolean },
        timeTaken: { type: Number },
      },
    ],
    status: {
      type: String,
      enum: ["started", "completed", "auto_submitted"],
      default: "started",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    totalScore: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 }, // total seconds
    categoryScores: {
      numerical: { score: Number, total: Number },
      verbal: { score: Number, total: Number },
      logical: { score: Number, total: Number },
      situational: { score: Number, total: Number },
    },
    violations: [
      {
        type: { type: String },
        timestamp: { type: Date },
      },
    ],
    candidateStatus: {
      type: String,
      enum: ["pending", "shortlisted", "selected", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AptitudeAttempt", aptitudeAttemptSchema);
