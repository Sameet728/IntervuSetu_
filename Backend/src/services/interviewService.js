const Interview = require("../models/Interview");
const { generateGreeting } = require("./geminiService");
const { processAnswer, getFollowupQuestion } = require("./evaluationService");
const { updateMemory } = require("./memoryService");
const { buildReport } = require("./reportService");

const MAX_VIOLATIONS = parseInt(process.env.MAX_VIOLATIONS) || 3;

/**
 * Start the interview session.
 */
const startInterview = async (interviewId, candidateName) => {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error("Interview not found");
  if (interview.status !== "created") throw new Error("Interview already started");

  interview.status = "active";
  interview.startedAt = new Date();
  interview.currentQuestionIndex = 0;
  await interview.save();

  const greeting = await generateGreeting({
    name: candidateName,
    role: interview.role,
    totalQuestions: interview.questions.length,
    interviewType: interview.interviewType,
  });

  interview.transcript.push({
    role: "ai",
    content: greeting,
    entryType: "greeting",
  });
  await interview.save();

  return {
    greeting,
    firstQuestion: interview.questions[0],
    totalQuestions: interview.questions.length,
    interviewType: interview.interviewType,
    difficulty: interview.difficulty,
  };
};

/**
 * Get the current active question.
 */
const getCurrentQuestion = async (interviewId) => {
  const interview = await Interview.findById(interviewId).lean();
  if (!interview) throw new Error("Interview not found");

  const idx = interview.currentQuestionIndex;
  const question = interview.questions[idx];
  if (!question) return null;

  return { question, index: idx, total: interview.questions.length };
};

/**
 * Mark current question as started (track start time).
 */
const markQuestionStarted = async (interviewId) => {
  const interview = await Interview.findById(interviewId);
  const q = interview.questions[interview.currentQuestionIndex];
  if (q && q.status === "pending") {
    q.status = "active";
    q.startedAt = new Date();

    interview.transcript.push({
      role: "ai",
      content: q.question,
      questionId: q.questionId,
      entryType: "question",
    });

    await interview.save();
  }
};

/**
 * Process user's answer to the current question.
 * Decides: follow-up OR next question OR complete.
 */
const submitAnswer = async (interviewId, userAnswer, code = null) => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") {
    throw new Error("Interview not active");
  }

  const idx = interview.currentQuestionIndex;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question");

  // Log user answer in transcript
  interview.transcript.push({
    role: "user",
    content: code ? `${userAnswer}\n\n[Code Submitted]` : userAnswer,
    questionId: currentQ.questionId,
    entryType: "answer",
  });

  // Evaluate the answer
  const evaluation = await processAnswer(interview, currentQ, userAnswer, code);

  // Record the answer (store the actual user answer text)
  currentQ.answers.push({
    type: currentQ.followupCount === 0 ? "main" : "followup",
    answer: userAnswer,
    code,
    score: evaluation.score,
    timestamp: new Date(),
  });

  if (evaluation.canAskFollowup && evaluation.score < 8) {
    // ── Ask follow-up ──────────────────────────────────────────────
    const previousFollowups = currentQ.answers
      .filter((a) => a.type === "followup")
      .map((a) => ({ question: a.followupQuestion, answer: a.answer }));

    const followupQuestion = await getFollowupQuestion(
      currentQ,
      userAnswer,
      code,
      previousFollowups,
      interview.longTermSummary
    );

    currentQ.followupCount += 1;

    const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
    lastAnswer.followupQuestion = followupQuestion;

    interview.transcript.push({
      role: "ai",
      content: followupQuestion,
      questionId: currentQ.questionId,
      entryType: "followup",
    });

    await interview.save();

    return {
      action: "followup",
      followupQuestion,
      evaluation: {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
        canAskFollowup: evaluation.canAskFollowup,
        followupCount: currentQ.followupCount,
      },
    };
  } else {
    // ── Finalize this question ─────────────────────────────────────
    currentQ.score = evaluation.score;
    currentQ.feedback = evaluation.shortFeedback + " " + evaluation.brutalFeedback;
    currentQ.idealAnswer = evaluation.idealAnswer;
    currentQ.strengths = evaluation.strength ? [evaluation.strength] : [];
    currentQ.weaknesses = evaluation.weakness ? [evaluation.weakness] : [];
    currentQ.status = "completed";
    currentQ.completedAt = new Date();
    currentQ.timeTaken = Math.round(
      (currentQ.completedAt - currentQ.startedAt) / 1000
    );

    // Update context memory
    const { shortTermMemory, longTermSummary } = await updateMemory(interview, {
      question: currentQ.question,
      questionType: currentQ.questionType,
      answer: userAnswer,
      score: evaluation.score,
    });
    interview.shortTermMemory = shortTermMemory;
    interview.longTermSummary = longTermSummary;

    return await _advanceToNext(interview, idx, evaluation);
  }
};

/**
 * Skip the current question (max 1 skip per interview).
 */
const skipQuestion = async (interviewId) => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") {
    throw new Error("Interview not active");
  }

  if (interview.skipUsed) {
    throw new Error("You have already used your skip for this interview.");
  }

  const idx = interview.currentQuestionIndex;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question");

  // Mark as skipped
  currentQ.status = "skipped";
  currentQ.completedAt = new Date();
  currentQ.timeTaken = Math.round(
    (new Date() - (currentQ.startedAt || new Date())) / 1000
  );
  interview.skipUsed = true;
  interview.skippedQuestions.push(currentQ.questionId);

  interview.transcript.push({
    role: "user",
    content: "[Question skipped]",
    questionId: currentQ.questionId,
    entryType: "skip",
  });

  const result = await _advanceToNext(interview, idx, null);
  return { ...result, skipUsed: true };
};

/**
 * Get the current question text for repeat.
 */
const repeatQuestion = async (interviewId) => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") {
    throw new Error("Interview not active");
  }

  const idx = interview.currentQuestionIndex;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question");

  let activeQuestionText = currentQ.question;
  let type = "main";

  if (currentQ.answers && currentQ.answers.length > 0) {
    const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
    if (lastAnswer.followupQuestion) {
      activeQuestionText = lastAnswer.followupQuestion;
      type = "followup";
    }
  }

  interview.transcript.push({
    role: "ai",
    content: activeQuestionText,
    questionId: currentQ.questionId,
    entryType: "repeat",
  });

  await interview.save();

  return { question: activeQuestionText, type, questionId: currentQ.questionId };
};

/**
 * Internal: advance to next question or complete interview
 */
const _advanceToNext = async (interview, idx, evaluation) => {
  const nextIdx = idx + 1;
  interview.currentQuestionIndex = nextIdx;

  if (nextIdx >= interview.questions.length) {
    // ── Interview complete ───────────────────────────────────────
    interview.status = "completed";
    interview.completedAt = new Date();
    interview.totalTimeTaken = Math.round(
      (interview.completedAt - interview.startedAt) / 1000
    );
    await interview.save();

    buildReport(interview._id).catch((e) =>
      console.error("Report generation error:", e.message)
    );

    return {
      action: "complete",
      evaluation: evaluation ? {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
      } : null,
      message: "Interview completed! Your report is being generated.",
    };
  } else {
    // ── Next question ────────────────────────────────────────────
    const nextQuestion = interview.questions[nextIdx];
    nextQuestion.status = "active";
    nextQuestion.startedAt = new Date();

    interview.transcript.push({
      role: "ai",
      content: nextQuestion.question,
      questionId: nextQuestion.questionId,
      entryType: "question",
    });

    await interview.save();

    return {
      action: "next",
      nextQuestion,
      questionIndex: nextIdx,
      totalQuestions: interview.questions.length,
      evaluation: evaluation ? {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
      } : null,
      skipUsed: interview.skipUsed,
    };
  }
};

/**
 * Record a proctoring violation.
 */
const recordViolation = async (interviewId, violationType, details = "") => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") return null;

  interview.violations.push({ type: violationType, details });
  interview.violationCount += 1;

  let autoSubmitted = false;

  if (interview.violationCount >= MAX_VIOLATIONS) {
    interview.status = "auto_submitted";
    interview.autoSubmitted = true;
    interview.completedAt = new Date();
    interview.totalTimeTaken = Math.round(
      (interview.completedAt - interview.startedAt) / 1000
    );
    autoSubmitted = true;

    buildReport(interview._id).catch((e) =>
      console.error("Auto-submit report error:", e.message)
    );
  }

  await interview.save();

  return {
    violationCount: interview.violationCount,
    maxViolations: MAX_VIOLATIONS,
    remainingChances: Math.max(0, MAX_VIOLATIONS - interview.violationCount),
    autoSubmitted,
  };
};

/**
 * Update per-question timer from frontend heartbeat
 */
const updateQuestionTimer = async (interviewId, questionTimeTaken, totalTimeTaken) => {
  const interview = await Interview.findById(interviewId);
  if (!interview) return;

  const q = interview.questions[interview.currentQuestionIndex];
  if (q) q.timeTaken = questionTimeTaken;
  interview.totalTimeTaken = totalTimeTaken;

  await interview.save();
};

module.exports = {
  startInterview,
  getCurrentQuestion,
  markQuestionStarted,
  submitAnswer,
  skipQuestion,
  repeatQuestion,
  recordViolation,
  updateQuestionTimer,
};
