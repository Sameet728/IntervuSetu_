const mongoose = require("mongoose");
const { customAlphabet } = require("nanoid");

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

const templateSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Interview metadata
    title: { type: String, required: true, trim: true, maxlength: 200 },
    role: { type: String, required: true, trim: true },
    interviewType: {
      type: String,
      enum: ["technical", "hr", "behavioral", "system_design", "mixed"],
      default: "mixed",
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "adaptive"],
      default: "adaptive",
    },
    duration: { type: Number, default: 45 }, // minutes
    questionCount: { type: Number, default: 8, min: 3, max: 20 },
    techStack: [{ type: String, trim: true }],
    instructions: { type: String, default: "" },

    // Access control
    deadline: { type: Date, default: null },
    maxAttempts: { type: Number, default: 1 },
    proctoringEnabled: { type: Boolean, default: true },

    // Pre-generated questions (copied to each Interview on join)
    questions: [
      {
        questionId: String,
        question: String,
        questionType: {
          type: String,
          enum: ["code", "theory", "hr", "system_design", "behavioral"],
          default: "theory",
        },
        difficulty: {
          type: String,
          enum: ["easy", "medium", "hard"],
          default: "medium",
        },
        expectedAnswer: String,
        topic: String,
      },
    ],

    // Share link slug
    shareCode: {
      type: String,
      unique: true,
      default: () => nanoid(),
    },

    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "active",
    },

    // Cached stats (updated when reports come in)
    stats: {
      totalAttempts: { type: Number, default: 0 },
      completedAttempts: { type: Number, default: 0 },
      avgScore: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

templateSchema.index({ organizationId: 1, createdAt: -1 });
templateSchema.index({ shareCode: 1 });

module.exports = mongoose.model("InterviewTemplate", templateSchema);
