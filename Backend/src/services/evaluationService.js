const { evaluateAnswer, generateFollowup } = require("./geminiService");
const { buildContextPayload } = require("./memoryService");

const MAX_FOLLOWUPS = parseInt(process.env.MAX_FOLLOWUPS_PER_QUESTION) || 2;

/**
 * Compute intelligent interview pacing metrics based on elapsed time, planned duration,
 * remaining questions, and upcoming question types (e.g. coding rounds).
 *
 * @param {Object} interview - Mongoose interview document
 * @returns {Object} pacing metrics and adaptive guidelines
 */
function computePacingMetrics(interview) {
  const targetMins = Math.max(10, Number(interview.targetDuration) || 45);
  const startedAt = interview.startedAt ? new Date(interview.startedAt).getTime() : Date.now();
  const elapsedMs = Math.max(0, Date.now() - startedAt);
  const elapsedMins = elapsedMs / 60000;
  const remainingMins = Math.max(0, targetMins - elapsedMins);
  const timeRemainingPct = Math.round((remainingMins / targetMins) * 100);

  const totalQs = Array.isArray(interview.questions) ? interview.questions.length : 1;
  const currentIdx = Number(interview.currentQuestionIndex) || 0;
  const questionsLeft = Math.max(0, totalQs - (currentIdx + 1));

  // Check if any upcoming question is a coding question
  const upcomingQuestions = Array.isArray(interview.questions) ? interview.questions.slice(currentIdx + 1) : [];
  const hasUpcomingCodeQ = upcomingQuestions.some(
    (q) => q.questionType === "code" && q.status === "pending"
  );

  // Reserve time for upcoming coding questions (min 8 mins)
  const codingReserveMins = hasUpcomingCodeQ ? 8 : 0;
  const effectiveRemainingMins = Math.max(0, remainingMins - codingReserveMins);

  const minsPerRemainingQ = questionsLeft > 0
    ? effectiveRemainingMins / questionsLeft
    : remainingMins;

  let urgency = "normal";
  let targetFollowupSize = "standard";
  let maxFollowupWords = 25;

  if (minsPerRemainingQ < 3.0 || remainingMins <= 5 || (hasUpcomingCodeQ && remainingMins <= 10)) {
    urgency = "critical";
    targetFollowupSize = "short";
    maxFollowupWords = 12;
  } else if (minsPerRemainingQ < 5.0 || timeRemainingPct < 35) {
    urgency = "tight";
    targetFollowupSize = "short";
    maxFollowupWords = 16;
  } else if (minsPerRemainingQ >= 8.0 && timeRemainingPct >= 65) {
    urgency = "relaxed";
    targetFollowupSize = "deep";
    maxFollowupWords = 35;
  }

  return {
    targetMins,
    elapsedMins: Math.round(elapsedMins * 10) / 10,
    remainingMins: Math.round(remainingMins * 10) / 10,
    timeRemainingPct,
    questionsLeft,
    hasUpcomingCodeQ,
    minsPerRemainingQ: Math.round(minsPerRemainingQ * 10) / 10,
    urgency,
    targetFollowupSize,
    maxFollowupWords,
  };
}

/**
 * Determine dynamic follow-up limit based on:
 * 1. User's response quality & content (score, word count, blank/evasive)
 * 2. Time duration remaining & questions left to cover
 * 3. Question type (intro/hr = 0, coding = specialized, theory/system_design = paced)
 *
 * @param {Object} params
 * @returns {number} followupLimit (0, 1, or 2)
 */
function getDynamicFollowupLimit({ score, userAnswer = "", code = null, questionData = null, pacing }) {
  const qType = questionData?.questionType || "theory";

  // 1. Never follow up on warm-up / intro questions
  if (
    qType === "hr" ||
    qType === "intro" ||
    questionData?.questionId === "q_intro" ||
    questionData?.topic === "Self Introduction" ||
    /(introduce yourself|tell me about yourself|walk me through your background)/i.test(questionData?.question || "")
  ) {
    return 0;
  }

  // 2. Candidate answered with "I don't know", blank, or passed -> do not grill, move forward
  const cleanAnswer = (userAnswer || "").trim().toLowerCase();
  const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
  const isEvasiveOrUnknown =
    wordCount < 4 && !code ||
    /^(i don't know|no idea|not sure|i do not know|pass|skip|next question|no clue)\.?$/i.test(cleanAnswer);

  if (isEvasiveOrUnknown) {
    console.log(`⏩ Candidate indicated lack of knowledge or minimal response (${wordCount} words) — skipping follow-up.`);
    return 0;
  }

  // 3. User's answer is already outstanding (score >= 8.8) -> nailed it, advance to cover breadth
  if (score >= 8.8) {
    console.log(`🎯 Outstanding answer (${score}/10) — skipping follow-up to cover breadth.`);
    return 0;
  }

  // 4. Critical time crunch -> must cover all remaining questions (especially coding)
  if (pacing.urgency === "critical") {
    console.log(`⏱️ Critical time crunch (${pacing.minsPerRemainingQ}m/Q left, ${pacing.questionsLeft} Qs remaining) — skipping follow-up.`);
    return 0;
  }

  // 5. Tight time pressure (minsPerRemainingQ < 5m)
  if (pacing.urgency === "tight") {
    // Only allow 1 quick follow-up if candidate's answer was significantly weak (< 5.5)
    if (score < 5.5) {
      console.log(`⏱️ Tight time (${pacing.minsPerRemainingQ}m/Q), weak answer (${score}/10) — allowing 1 rapid follow-up.`);
      return 1;
    }
    console.log(`⏱️ Tight time (${pacing.minsPerRemainingQ}m/Q), adequate score (${score}/10) — moving to next question.`);
    return 0;
  }

  // 6. Normal time budget (5-8m per remaining Q)
  if (pacing.urgency === "normal") {
    // Coding questions: 1 follow-up max (e.g. edge cases/complexity)
    if (qType === "code") return 1;
    // Theory / System Design: 1 follow-up if score < 8.8
    if (score < 8.8) return 1;
    return 0;
  }

  // 7. Relaxed time budget (>8m per remaining Q, plenty of time)
  if (pacing.urgency === "relaxed") {
    if (score < 4.0 && wordCount > 10) {
      // Significantly confused answer but candidate is actively attempting -> allow up to 2 follow-ups
      return Math.min(2, MAX_FOLLOWUPS);
    }
    if (score < 8.8) return 1;
    return 0;
  }

  return 1;
}

/**
 * Backward-compatible helper.
 */
const getFollowupLimit = (score, timeRemainingPct = 60, questionType = "technical", questionData = null) => {
  if (questionType === "hr" || questionType === "intro") return 0;
  if (questionData?.questionId === "q_intro" || questionData?.topic === "Self Introduction") return 0;
  if (/(introduce yourself|tell me about yourself|your background|who you are)/i.test(questionData?.question || "")) return 0;
  if (timeRemainingPct <= 20) return 0;
  if (score >= 8.8) return 0;
  return 1;
};

/**
 * Calculate percentage of interview time remaining.
 * @param {Date} startedAt     - when interview started
 * @param {number} targetMins  - total planned duration in minutes
 * @returns {number}           - percentage remaining (0-100)
 */
function calcTimeRemainingPct(startedAt, targetMins = 45) {
  if (!startedAt) return 60; // Default to mid-session estimate
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  const elapsedMins = elapsedMs / 60000;
  const remainingMins = Math.max(0, targetMins - elapsedMins);
  return Math.round((remainingMins / targetMins) * 100);
}

/**
 * Evaluate a main or follow-up answer.
 * Returns structured evaluation + time-aware follow-up decision.
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

    // ── Self-Introduction Warm-Up Check ──────────────────────────────
    const isIntro =
      questionData.questionId === "q_intro" ||
      questionData.topic === "Self Introduction" ||
      questionData.questionType === "hr" ||
      questionData.questionType === "intro" ||
      /(introduce yourself|tell me about yourself|your background|who you are)/i.test(questionData.question || "");

    if (isIntro) {
      console.log("👋 Evaluating Self-Introduction warm-up (no follow-ups allowed)...");
      const wordCount = (userAnswer || "").split(/\s+/).filter(Boolean).length;
      const introScore = wordCount >= 30 ? 9.0 : wordCount >= 15 ? 8.0 : 7.0;

      return {
        score: introScore,
        shortFeedback: "Great introduction! Communicated background, technical projects, and career focus clearly.",
        brutalFeedback: wordCount < 20 ? "Try to highlight specific impactful projects and technologies in future introductions." : "Clear overview of background and recent experience.",
        strength: "Confident communication and clear overview of technical background",
        weakness: wordCount < 20 ? "Could highlight key metrics or architectural highlights" : "Good communication",
        idealAnswer: "A great self-introduction outlines education/background, core technical stack, recent project highlights, and motivation for the role.",
        canAskFollowup: false,
        followupLimit: 0,
        currentFollowupCount: 0,
        moveToNext: true,
        timeRemainingPct: calcTimeRemainingPct(interview.startedAt, interview.targetDuration || 45),
        _isIntro: true,
        _prevQuestionType: "hr",
      };
    }

    const { contextSummary, recentQA } = buildContextPayload(
      interview.shortTermMemory,
      interview.longTermSummary
    );

    // Determine the actual question the user is answering
    let actualQuestionText = questionData.question;
    const isFollowup = questionData.followupCount > 0;

    if (isFollowup && questionData.answers && questionData.answers.length > 0) {
      const lastAnswer = questionData.answers[questionData.answers.length - 1];
      if (lastAnswer && lastAnswer.followupQuestion) {
        actualQuestionText = lastAnswer.followupQuestion;
      }
    }

    console.log(`🤖 Evaluating via Local/Gemini AI... (isFollowup: ${isFollowup})`);
    const evaluation = await evaluateAnswer({
      question: actualQuestionText,
      originalMainQuestion: isFollowup ? questionData.question : null,
      questionType: questionData.questionType,
      expectedAnswer: questionData.expectedAnswer,
      topic: questionData.topic,
      userAnswer,
      code,
      contextSummary,
      recentQA,
      role: interview.role,
      techStack: interview.techStack,
    });

    console.log(`✅ Evaluation complete, score: ${evaluation.score}/10`);

    // ── Intelligent Time & Answer-Aware Pacing ─────────────────────────
    const pacing = computePacingMetrics(interview);
    const followupLimit = getDynamicFollowupLimit({
      score: evaluation.score,
      userAnswer,
      code,
      questionData,
      pacing,
    });
    const currentFollowups = questionData.followupCount || 0;
    const canAskFollowup = currentFollowups < followupLimit;

    console.log(
      `⏱️ [PACING] Remaining: ${pacing.remainingMins}m (${pacing.timeRemainingPct}%), Qs Left: ${pacing.questionsLeft}, ` +
      `Budget: ${pacing.minsPerRemainingQ}m/Q, Urgency: ${pacing.urgency}, Follow-up Allowed: ${canAskFollowup} (Limit: ${followupLimit})`
    );

    return {
      ...evaluation,
      canAskFollowup,
      followupLimit,
      currentFollowupCount: currentFollowups,
      moveToNext: !canAskFollowup,
      timeRemainingPct: pacing.timeRemainingPct,
      pacing,
      _prevQuestionType: questionData.questionType,
    };
  } catch (error) {
    console.error(`❌ Error in processAnswer, using deterministic fallback:`, error.message);
    const isIntro =
      questionData?.questionId === "q_intro" ||
      questionData?.topic === "Self Introduction" ||
      questionData?.questionType === "hr" ||
      /(introduce yourself|tell me about yourself|your background|who you are)/i.test(questionData?.question || "");
    const wordCount = (userAnswer || "").split(/\s+/).filter(Boolean).length;
    const score = isIntro ? (wordCount >= 20 ? 8.5 : 7.5) : (wordCount > 50 ? 7.5 : wordCount > 20 ? 6.5 : 5);
    const pacing = computePacingMetrics(interview);
    const followupLimit = isIntro ? 0 : getDynamicFollowupLimit({ score, userAnswer, code, questionData, pacing });

    return {
      score,
      shortFeedback: isIntro ? "Introduction recorded." : "Answer received and recorded.",
      brutalFeedback: isIntro ? "Clear overview of background." : "Consider providing more structured detail with concrete examples.",
      strength: isIntro ? "Clear articulation of background" : "Attempted to address the question",
      weakness: isIntro ? "Could highlight key metrics" : "Could add more depth with specific examples",
      idealAnswer: isIntro ? "A strong introduction clearly summarizes education, core tech stack, and key project impacts." : "A comprehensive answer covers the mechanism, trade-offs, edge cases, and best practices.",
      canAskFollowup: isIntro ? false : (questionData.followupCount || 0) < followupLimit,
      followupLimit,
      currentFollowupCount: questionData.followupCount || 0,
      moveToNext: isIntro || (questionData.followupCount || 0) >= followupLimit,
      timeRemainingPct: pacing.timeRemainingPct,
      pacing,
      _isIntro: isIntro,
      _prevQuestionType: isIntro ? "hr" : (questionData?.questionType || "general"),
    };
  }
};

/**
 * Generate a follow-up question for a weak answer.
 * Adapts size and brevity based on interview pacing.
 *
 * @param {Object} questionData - current question
 * @param {String} userAnswer   - last user answer
 * @param {String|null} code
 * @param {Array} previousFollowups - list of {question, answer}
 * @param {String} contextSummary
 * @param {Object|null} pacing - time pacing metrics
 * @returns {String} - follow-up question text
 */
const getFollowupQuestion = async (
  questionData,
  userAnswer,
  code = null,
  previousFollowups = [],
  contextSummary = "",
  pacing = null
) => {
  const result = await generateFollowup({
    question: questionData.question,
    questionType: questionData.questionType,
    userAnswer,
    code,
    previousFollowups,
    contextSummary,
    pacing,
  });

  // Handle both string return (old fallback) and object return (LangChain)
  if (typeof result === "string") return result;
  if (result && result.followupQuestion) return result.followupQuestion;
  return pacing?.targetFollowupSize === "short"
    ? "In one sentence, what is the primary architectural trade-off here?"
    : "Can you elaborate on your approach and walk me through your reasoning in more detail?";
};

module.exports = {
  processAnswer,
  getFollowupQuestion,
  getFollowupLimit,
  getDynamicFollowupLimit,
  computePacingMetrics,
  calcTimeRemainingPct,
};
