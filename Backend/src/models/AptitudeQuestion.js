const mongoose = require("mongoose");

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: [
      {
        text: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    category: {
      type: String,
      required: true,
      enum: ["numerical", "verbal", "logical", "situational"],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },
    detailedSolution: {
      type: String,
      trim: true,
    },
    tags: [{ type: String, trim: true }], // topic-based filtering
    companies: [{ type: String, trim: true }], // company-based filtering
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AptitudeQuestion", aptitudeQuestionSchema);
