const mongoose = require("mongoose");

// ─── Sub-schemas ────────────────────────────────────────────────────

const questionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, required: true },
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
    expectedAnswer: { type: String, default: "" },
    topic: { type: String, default: "" },

    // Timing
    startedAt: { type: Date },
    completedAt: { type: Date },
    timeTaken: { type: Number, default: 0 }, // seconds

    // Evaluation
    score: { type: Number, default: null },         // 0–10
    feedback: { type: String, default: "" },
    idealAnswer: { type: String, default: "" },
    strengths: [String],
    weaknesses: [String],

    // Conversation for this question
    answers: [
      {
        type: { type: String, enum: ["main", "followup"], default: "main" },
        answer: String,
        code: String,              // for code questions
        timestamp: { type: Date, default: Date.now },
        followupQuestion: String,  // follow-up AI asked after this answer
        score: Number,
      },
    ],

    followupCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "skipped"],
      default: "pending",
    },
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["ai", "user"], required: true },
    content: { type: String, required: true },
    questionId: String,
    timestamp: { type: Date, default: Date.now },
    entryType: {
      type: String,
      enum: ["greeting", "question", "answer", "followup", "evaluation", "closing", "skip", "repeat"],
      default: "answer",
    },
  },
  { _id: false }
);

const proctoringViolationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["no_face", "multiple_faces", "fullscreen_exit", "tab_switch", "focus_lost"],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    details: String,
  },
  { _id: false }
);

// ─── Main Interview Schema ───────────────────────────────────────────

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ─── Organization linkage (null for solo interviews) ────────────
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewTemplate",
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    attemptNumber: { type: Number, default: 1 },

    // Setup
    role: { type: String, required: true, trim: true },
    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior", "lead"],
      required: true,
    },
    techStack: [{ type: String, trim: true }],
    totalQuestions: { type: Number, default: 0 },

    // NEW: Interview type & difficulty
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
    targetDuration: { type: Number, default: 45 }, // minutes

    // NEW: Skip tracking
    skipUsed: { type: Boolean, default: false },
    skippedQuestions: [{ type: String }], // questionIds that were skipped

    // Questions
    questions: [questionSchema],
    currentQuestionIndex: { type: Number, default: 0 },

    // Transcript
    transcript: [transcriptEntrySchema],
    longTermSummary: { type: String, default: "" },
    shortTermMemory: { type: mongoose.Schema.Types.Mixed, default: [] },

    // Timing
    startedAt: { type: Date },
    completedAt: { type: Date },
    totalTimeTaken: { type: Number, default: 0 }, // seconds

    // Proctoring
    violations: [proctoringViolationSchema],
    violationCount: { type: Number, default: 0 },
    autoSubmitted: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ["created", "active", "paused", "completed", "auto_submitted", "expired"],
      default: "created",
      index: true,
    },

    // Report reference
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
    },
  },
  { timestamps: true }
);

// Indexes for common queries
interviewSchema.index({ userId: 1, status: 1 });
interviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Interview", interviewSchema);
