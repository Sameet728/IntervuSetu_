const { generateSummary } = require("./geminiService");

const SHORT_TERM_LIMIT = 3; // number of recent Q/A to keep verbatim

/**
 * Update the short-term memory and trigger summarization for long-term memory.
 * Called after each question is completed.
 *
 * @param {Object} interview - Mongoose interview document
 * @param {Object} completedQA - { question, questionType, answer, score }
 * @returns {Object} - { shortTermMemory, longTermSummary }
 */
const updateMemory = async (interview, completedQA) => {
  const { shortTermMemory = [], longTermSummary = "" } = interview;

  // Add to short-term memory
  const updatedShortTerm = [
    ...shortTermMemory,
    {
      question: completedQA.question,
      questionType: completedQA.questionType,
      answer: completedQA.answer,
      score: completedQA.score,
    },
  ];

  let updatedLongTerm = longTermSummary;

  // Once short-term exceeds limit, move oldest entry to long-term summary
  if (updatedShortTerm.length > SHORT_TERM_LIMIT) {
    const oldest = updatedShortTerm.shift(); // remove and get oldest

    // Asynchronously update long-term summary
    updatedLongTerm = await generateSummary({
      existingSummary: longTermSummary,
      newQA: oldest,
    });
  }

  return {
    shortTermMemory: updatedShortTerm,
    longTermSummary: updatedLongTerm,
  };
};

/**
 * Build the context payload to send to Gemini for evaluation.
 * Combines long-term summary and short-term verbatim Q/A.
 *
 * @param {Array} shortTermMemory
 * @param {String} longTermSummary
 * @returns {Object} - { contextSummary, recentQA }
 */
const buildContextPayload = (shortTermMemory = [], longTermSummary = "") => {
  return {
    contextSummary: longTermSummary,
    recentQA: shortTermMemory.map((m) => ({
      question: m.question,
      answer: m.answer,
      score: m.score,
    })),
  };
};

/**
 * Format full transcript as readable text for download/PDF
 */
const formatTranscriptText = (transcript = []) => {
  return transcript
    .map((entry) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const role = entry.role === "ai" ? "🤖 Interviewer" : "👤 Candidate";
      return `[${time}] ${role}:\n${entry.content}\n`;
    })
    .join("\n---\n\n");
};

module.exports = {
  updateMemory,
  buildContextPayload,
  formatTranscriptText,
};
