const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ─── Organization linkage ───────────────────────────────────────
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

    // ─── AI-generated org context tags ─────────────────────────────
    candidateTags: [String],      // ["Strong in DSA", "Needs communication improvement"]
    strengthSummary: { type: String, default: "" },
    weaknessSummary: { type: String, default: "" },
    badge: {
      type: String,
      enum: ["Top Performer", "Fast Solver", "Strong Communicator", "Strong in DSA", null],
      default: null,
    },

    // ─── HR decision ─────────────────────────────────────────────
    candidateStatus: {
      type: String,
      enum: ["pending", "shortlisted", "selected", "rejected"],
      default: "pending",
    },

    // Candidate info
    role: String,
    experienceLevel: String,
    techStack: [String],
    interviewType: {
      type: String,
      enum: ["technical", "hr", "behavioral", "system_design", "mixed"],
      default: "mixed",
    },
    difficulty: String,

    // Overall scores
    overallScore: { type: Number, default: 0 },     // 0–10
    communicationScore: { type: Number, default: 0 },
    technicalScore: { type: Number, default: 0 },
    problemSolvingScore: { type: Number, default: 0 },
    hrScore: { type: Number, default: 0 },
    codeQualityScore: { type: Number, default: 0 },

    // Aggregated feedback
    strengths: [String],
    weaknesses: [String],
    overallFeedback: String,
    recommendation: {
      type: String,
      enum: ["strong_hire", "hire", "borderline", "no_hire", "strong_no_hire"],
    },

    // NEW: Improvement guidance
    improvementAreas: [String],
    topicsToStudy: [String],

    // Per-question breakdown
    questionBreakdown: [
      {
        questionId: String,
        question: String,
        questionType: String,
        difficulty: String,
        score: Number,
        feedback: String,
        idealAnswer: String,
        userAnswer: String,        // NEW: candidate's actual answer
        userCode: String,          // NEW: candidate's submitted code
        timeTaken: Number,
        followupCount: Number,
        strengths: [String],
        weaknesses: [String],
      },
    ],

    // Timing stats
    totalTimeTaken: Number,
    averageTimePerQuestion: Number,

    // Proctoring summary
    violationCount: Number,
    autoSubmitted: Boolean,

    // Interview transcript (full)
    transcriptText: String,

    // PDF path if generated
    pdfPath: String,
    pdfGeneratedAt: Date,
  },
  { timestamps: true }
);

reportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
