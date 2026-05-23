const { evaluateAnswer, generateFollowup } = require("./geminiService");
const { buildContextPayload } = require("./memoryService");

const MAX_FOLLOWUPS = parseInt(process.env.MAX_FOLLOWUPS_PER_QUESTION) || 3;

/**
 * Determine how many follow-ups to allow based on score.
 * Score bands:
 *  >= 8  → 0 follow-ups (move on)
 *  5–7   → 1 follow-up
 *  3–4   → 2 follow-ups
 *  < 3   → 3 follow-ups
 */
const getFollowupLimit = (score) => {
  if (score >= 8) return 0;
  if (score >= 5) return 1;
  if (score >= 3) return 2;
  return Math.min(3, MAX_FOLLOWUPS);
};

/**
 * Evaluate a main or follow-up answer.
 * Returns structured evaluation + follow-up decision.
 *
 * @param {Object} interview  - Mongoose interview document
 * @param {Object} questionData - current question object
 * @param {String} userAnswer
 * @param {String|null} code - optional code submission
 * @returns {Object} - evaluation result
 */
const processAnswer = async (interview, questionData, userAnswer, code = null) => {
  try {
    console.log(`🔍 Evaluating answer for question: ${questionData.questionId}`);
    
    const { contextSummary, recentQA } = buildContextPayload(
      interview.shortTermMemory,
      interview.longTermSummary
    );

    // Call Gemini to evaluate
    console.log(`🤖 Calling Gemini API for evaluation...`);
    const evaluation = await evaluateAnswer({
      question: questionData.question,
      questionType: questionData.questionType,
      expectedAnswer: questionData.expectedAnswer,
      userAnswer,
      code,
      contextSummary,
      recentQA,
    });

    console.log(`✅ Evaluation complete, score: ${evaluation.score}/10`);

    const followupLimit = getFollowupLimit(evaluation.score);
    const currentFollowups = questionData.followupCount || 0;
    const canAskFollowup = currentFollowups < followupLimit;

    return {
      ...evaluation,
      canAskFollowup,
      followupLimit,
      currentFollowupCount: currentFollowups,
      moveToNext: !canAskFollowup,
    };
  } catch (error) {
    console.error(`❌ Error in processAnswer:`, error);
    throw new Error(`Failed to evaluate answer: ${error.message}`);
  }
};

/**
 * Generate a follow-up question for a weak answer.
 *
 * @param {Object} questionData - current question
 * @param {String} userAnswer   - last user answer
 * @param {String|null} code
 * @param {Array} previousFollowups - list of {question, answer}
 * @param {String} contextSummary
 * @returns {String} - follow-up question text
 */
const getFollowupQuestion = async (
  questionData,
  userAnswer,
  code = null,
  previousFollowups = [],
  contextSummary = ""
) => {
  const result = await generateFollowup({
    question: questionData.question,
    questionType: questionData.questionType,
    userAnswer,
    code,
    previousFollowups,
    contextSummary,
  });

  return result.followupQuestion;
};

module.exports = {
  processAnswer,
  getFollowupQuestion,
  getFollowupLimit,
};
