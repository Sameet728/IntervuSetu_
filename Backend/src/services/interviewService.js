const Interview = require("../models/Interview");
const { generateGreeting } = require("./geminiService");
const { processAnswer, getFollowupQuestion } = require("./evaluationService");
const { updateMemory } = require("./memoryService");
const { buildReport } = require("./reportService");

const MAX_VIOLATIONS = parseInt(process.env.MAX_VIOLATIONS) || 100;

// ─── Natural conversational transitions between questions ─────────────────
// The AI acknowledges the candidate's answer naturally before asking the next question
const CONVERSATIONAL_TRANSITIONS = {
  hr: [
    "That's really helpful context, thanks for sharing that.",
    "Appreciate you opening up about that — good to know.",
    "Got it, that gives me a nice picture of your background.",
    "Nice, I like how you've framed that.",
    "That makes sense. I can see the path you've taken.",
  ],
  behavioral: [
    "That's a great example, I appreciate the detail.",
    "Solid. That really shows how you handle pressure.",
    "Good, I like hearing real examples like that.",
    "That's useful context. Thanks for walking me through it.",
    "Nice — that kind of hands-on experience is exactly what we look for.",
  ],
  technical: [
    "Good. That covers the key concepts well.",
    "Yep, that's on the right track. Let me dig a little deeper.",
    "Solid foundation there. Let's push further.",
    "Right, good understanding. Now let's get into something more interesting.",
    "Good answer. I want to explore this more.",
  ],
  code: [
    "Alright, let's switch gears and get into some actual coding.",
    "Okay, now I want to see how you think through code.",
    "Good. Let's see how you approach problem-solving in code.",
    "I'd like to test your implementation skills now.",
    "Perfect. Time for a coding challenge — this is where it gets fun.",
  ],
  system_design: [
    "Good. Let's zoom out and think about architecture.",
    "Alright, I want to explore your systems thinking now.",
    "Good answer. Now let's talk about how you design at scale.",
    "Solid. Let me give you a design problem.",
    "Great. Let's see how you approach system design.",
  ],
  general: [
    "Got it, thanks.",
    "Good, I appreciate that.",
    "Alright, let's keep going.",
    "Nice. Moving on.",
    "Good answer. Next question.",
  ],
};

/**
 * Pick a natural, contextual transition phrase based on the question type and score.
 */
function getTransition(questionType = "general", score = 7, isSkipped = false) {
  if (isSkipped) {
    return "No worries, let's move on.";
  }

  const pool = CONVERSATIONAL_TRANSITIONS[questionType] || CONVERSATIONAL_TRANSITIONS.general;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

/**
 * Build a conversational bridge: "Transition. Now, [next question]"
 * Makes the interview feel like a real flowing conversation.
 */
function buildConversationalQuestion(nextQuestion, prevEvaluation = null, wasSkipped = false) {
  // If transitioning from the self-intro warm-up to the first real question:
  if (prevEvaluation?._isIntro) {
    const introTransitions = [
      "Thanks for introducing yourself! Great to learn more about your background. Let's dive right into our first technical question — ",
      "Awesome, love that practical background. Let's get right into the technical discussion — ",
      "Nice to meet you! That's really helpful context. Now let's move into our first question — ",
      "Great intro! Appreciate you sharing that. Now, let's dive into the core questions — ",
    ];
    const tr = introTransitions[Math.floor(Math.random() * introTransitions.length)];
    return tr + nextQuestion.question;
  }

  // If time is critically short, keep transition concise to protect candidate's answering time
  if (prevEvaluation?.pacing?.urgency === "critical") {
    return `Time is moving fast, so let's jump straight to our next question — ${nextQuestion.question}`;
  }

  const transition = getTransition(
    prevEvaluation ? (prevEvaluation._prevQuestionType || "general") : "general",
    prevEvaluation?.score || 7,
    wasSkipped
  );

  const questionText = nextQuestion.question;

  // For HR questions, add a softer intro
  if (nextQuestion.questionType === "hr") {
    const hrIntros = [
      `${transition} On a more personal note — `,
      `${transition} Switching gears a bit — `,
      `${transition} Here's one I like to ask everyone — `,
    ];
    return hrIntros[Math.floor(Math.random() * hrIntros.length)] + questionText;
  }

  // For coding questions, add a heads-up
  if (nextQuestion.questionType === "code") {
    const codeIntros = [
      `${transition} I'm going to give you a coding problem now. `,
      `${transition} Let's write some code. `,
      `${transition} Here's a technical challenge I'd like you to tackle — `,
    ];
    return codeIntros[Math.floor(Math.random() * codeIntros.length)] + questionText;
  }

  // For system_design questions
  if (nextQuestion.questionType === "system_design") {
    return `${transition} Let me give you a design scenario. ${questionText}`;
  }

  // Default: transition + question naturally
  return `${transition} ${questionText}`;
}

/**
 * Start the interview session.
 */
const startInterview = async (interviewId, candidateName) => {
  const interview = await Interview.findById(interviewId);
  if (!interview) throw new Error("Interview not found");
  if (interview.status === "completed" || interview.status === "auto_submitted") {
    throw new Error("Interview already completed");
  }

  // Resume active interview
  if (interview.status === "active") {
    const idx = interview.currentQuestionIndex || 0;
    const currentQ = interview.questions[idx];

    let activeQuestionText = currentQ.question;
    if (currentQ.answers && currentQ.answers.length > 0) {
      const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
      if (lastAnswer.followupQuestion) {
        activeQuestionText = lastAnswer.followupQuestion;
      }
    }

    const virtualFirstQ = { ...(currentQ.toObject ? currentQ.toObject() : currentQ), question: activeQuestionText };

    return {
      greeting: `Welcome back, ${candidateName.split(" ")[0]}! Let's pick up right where we left off.`,
      firstQuestion: virtualFirstQ,
      totalQuestions: interview.questions.length,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      questionIndex: idx,
    };
  }

  interview.status = "active";
  interview.startedAt = new Date();
  interview.currentQuestionIndex = 0;
  await interview.save();

  const greeting = await generateGreeting({
    name: candidateName,
    role: interview.role,
    totalQuestions: interview.questions.length,
    interviewType: interview.interviewType,
    duration: interview.targetDuration,
  });

  // Ensure Question 0 is GUARANTEED to be the self-introduction / warm-up question
  const hasIntroFirst = interview.questions.length > 0 && (
    interview.questions[0].questionId === "q_intro" ||
    interview.questions[0].topic === "Self Introduction" ||
    interview.questions[0].questionType === "hr" ||
    interview.questions[0].questionType === "intro" ||
    /(introduce yourself|tell me about yourself|walk me through your background)/i.test(interview.questions[0].question)
  );

  if (hasIntroFirst) {
    // Unify question text with greeting
    interview.questions[0].question = greeting;
    interview.questions[0].questionId = "q_intro";
    interview.questions[0].questionType = "hr";
    interview.questions[0].topic = "Self Introduction";
    interview.questions[0].expectedAnswer = "Clear articulation of background, relevant experience, projects, and role alignment.";
  } else {
    // Prepend mandatory self-intro question as questions[0]
    interview.questions.unshift({
      questionId: "q_intro",
      question: greeting,
      questionType: "hr",
      difficulty: "easy",
      expectedAnswer: "Clear articulation of background, relevant experience, projects, and role alignment.",
      topic: "Self Introduction",
      status: "pending",
      answers: [],
      followupCount: 0,
      score: null,
    });
    interview.totalQuestions = interview.questions.length;
  }

  const firstQ = interview.questions[0];

  if (!Array.isArray(interview.transcript)) interview.transcript = [];
  interview.transcript.push({
    role: "ai",
    content: greeting,
    questionId: "q_intro",
    entryType: "greeting",
    timestamp: new Date(),
  });
  await interview.save();

  // Return the first question unified with greeting
  return {
    greeting,
    firstQuestion: interview.questions[0],
    totalQuestions: interview.questions.length,
    interviewType: interview.interviewType,
    difficulty: interview.difficulty,
    questionIndex: 0,
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

    if (!Array.isArray(interview.transcript)) interview.transcript = [];
    const alreadyLogged = interview.transcript.some(
      (t) => t.questionId === q.questionId && (t.entryType === "greeting" || t.entryType === "question")
    );
    if (!alreadyLogged) {
      interview.transcript.push({
        role: "ai",
        content: q.question,
        questionId: q.questionId,
        entryType: "question",
        timestamp: new Date(),
      });
    }

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
  if (!Array.isArray(interview.transcript)) interview.transcript = [];
  interview.transcript.push({
    role: "user",
    content: code ? `${userAnswer}\n\n[Code Submitted]` : userAnswer,
    questionId: currentQ.questionId,
    entryType: "answer",
    timestamp: new Date(),
  });

  // Evaluate the answer
  const evaluation = await processAnswer(interview, currentQ, userAnswer, code);

  // Record the answer
  currentQ.answers.push({
    type: currentQ.followupCount === 0 ? "main" : "followup",
    answer: userAnswer,
    code,
    score: evaluation.score,
    timestamp: new Date(),
  });

  if (evaluation.canAskFollowup && evaluation.score < 8.8) {
    // ── Ask follow-up (conversational, not robotic) ────────────────
    const previousFollowups = currentQ.answers
      .filter((a) => a.type === "followup")
      .map((a) => ({ question: a.followupQuestion, answer: a.answer }));

    const rawFollowup = await getFollowupQuestion(
      currentQ,
      userAnswer,
      code,
      previousFollowups,
      interview.longTermSummary,
      evaluation.pacing
    );

    // Add natural acknowledgment before the follow-up, adapted to time pacing urgency
    let conversationalFollowup;
    if (evaluation.pacing?.urgency === "critical" || evaluation.pacing?.urgency === "tight") {
      const tightAcks = [
        "Quick follow-up — ",
        "One quick check on that — ",
        "Briefly — ",
        "Got it. Quick question — ",
      ];
      const ackIdx = Math.floor(Math.random() * tightAcks.length);
      conversationalFollowup = tightAcks[ackIdx] + rawFollowup;
    } else {
      const followupAcknowledgments = [
        "Interesting. Let me probe a bit deeper — ",
        "Got it. I want to dig into that a little more — ",
        "Okay, that's a good start. One more on this — ",
        "Right. Let me follow up on that — ",
        "Makes sense. How about this — ",
      ];
      const ackIdx = Math.floor(Math.random() * followupAcknowledgments.length);
      conversationalFollowup = followupAcknowledgments[ackIdx] + rawFollowup;
    }

    currentQ.followupCount += 1;

    const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
    lastAnswer.followupQuestion = conversationalFollowup;

    interview.transcript.push({
      role: "ai",
      content: conversationalFollowup,
      questionId: currentQ.questionId,
      entryType: "followup",
      timestamp: new Date(),
    });

    await interview.save();

    return {
      action: "followup",
      followupQuestion: conversationalFollowup,
      evaluation: {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
        canAskFollowup: evaluation.canAskFollowup,
        followupCount: currentQ.followupCount,
        pacing: evaluation.pacing,
      },
    };
  } else {
    // ── Finalize this question ─────────────────────────────────────
    currentQ.score = evaluation.score;
    currentQ.feedback = (evaluation.shortFeedback || "") + " " + (evaluation.brutalFeedback || "");
    currentQ.idealAnswer = evaluation.idealAnswer;
    currentQ.strengths = evaluation.strength ? [evaluation.strength] : [];
    currentQ.weaknesses = evaluation.weakness ? [evaluation.weakness] : [];
    currentQ.status = "completed";
    currentQ.completedAt = new Date();
    currentQ.timeTaken = Math.round(
      (currentQ.completedAt - (currentQ.startedAt || currentQ.completedAt)) / 1000
    );

    // Store question type for transition
    evaluation._prevQuestionType = currentQ.questionType;
    if (currentQ.questionId === "q_intro" || currentQ.topic === "Self Introduction" || evaluation._isIntro) {
      evaluation._isIntro = true;
    }

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

  const idx = interview.currentQuestionIndex || 0;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question to skip");

  currentQ.status = "skipped";
  currentQ.score = 0;
  currentQ.feedback = "Question skipped by candidate (Score: 0/10).";
  currentQ.completedAt = new Date();
  currentQ.timeTaken = Math.round(
    (new Date() - (currentQ.startedAt || new Date())) / 1000
  );
  interview.skipUsed = true;
  interview.skipCount = (interview.skipCount || 0) + 1;
  if (!Array.isArray(interview.skippedQuestions)) interview.skippedQuestions = [];
  interview.skippedQuestions.push(currentQ.questionId);

  if (!Array.isArray(interview.transcript)) interview.transcript = [];
  interview.transcript.push({
    role: "user",
    content: "[Question skipped]",
    questionId: currentQ.questionId,
    entryType: "skip",
    timestamp: new Date(),
  });

  await interview.save();

  const result = await _advanceToNext(interview, idx, null, true);
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
    timestamp: new Date(),
  });

  await interview.save();

  return { question: activeQuestionText, type, questionId: currentQ.questionId };
};

/**
 * Provide a hint for the current question without advancing or reducing score.
 */
const provideHint = async (interviewId, code = "") => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") {
    throw new Error("Interview not active");
  }
  const idx = interview.currentQuestionIndex || 0;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question");

  let activeQuestionText = currentQ.question;
  if (currentQ.answers && currentQ.answers.length > 0) {
    const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
    if (lastAnswer.followupQuestion) {
      activeQuestionText = lastAnswer.followupQuestion;
    }
  }

  const { provideHintTool } = require("./langchainService");
  const { generateHintFallback } = require("./localAIService");

  let hintText;
  if (provideHintTool) {
    try {
      const res = await provideHintTool.invoke({
        question: activeQuestionText,
        code: code || "",
        role: interview.role || "Software Engineer",
      });
      hintText = res.hint || res.message;
    } catch {
      hintText = await generateHintFallback({
        question: activeQuestionText,
        code: code || "",
        role: interview.role || "Software Engineer",
      });
    }
  } else {
    hintText = await generateHintFallback({
      question: activeQuestionText,
      code: code || "",
      role: interview.role || "Software Engineer",
    });
  }

  if (!Array.isArray(interview.transcript)) interview.transcript = [];
  interview.transcript.push({
    role: "ai",
    content: `💡 Hint: ${hintText}`,
    questionId: currentQ.questionId,
    entryType: "hint",
    timestamp: new Date(),
  });
  await interview.save();

  return { hint: hintText, message: `Here is a hint to guide you: ${hintText}` };
};

/**
 * Clarify problem requirements or constraints.
 */
const clarifyQuestion = async (interviewId, query = "") => {
  const interview = await Interview.findById(interviewId);
  if (!interview || interview.status !== "active") {
    throw new Error("Interview not active");
  }
  const idx = interview.currentQuestionIndex || 0;
  const currentQ = interview.questions[idx];
  if (!currentQ) throw new Error("No active question");

  let activeQuestionText = currentQ.question;
  if (currentQ.answers && currentQ.answers.length > 0) {
    const lastAnswer = currentQ.answers[currentQ.answers.length - 1];
    if (lastAnswer.followupQuestion) {
      activeQuestionText = lastAnswer.followupQuestion;
    }
  }

  const { clarifyQuestionTool } = require("./langchainService");
  const { clarifyQuestionFallback } = require("./localAIService");

  let clarificationText;
  if (clarifyQuestionTool) {
    try {
      const res = await clarifyQuestionTool.invoke({
        question: activeQuestionText,
        query: query || "Can you clarify the constraints?",
        role: interview.role || "Software Engineer",
      });
      clarificationText = res.clarification || res.message;
    } catch {
      clarificationText = await clarifyQuestionFallback({
        question: activeQuestionText,
        query: query || "Can you clarify the constraints?",
        role: interview.role || "Software Engineer",
      });
    }
  } else {
    clarificationText = await clarifyQuestionFallback({
      question: activeQuestionText,
      query: query || "Can you clarify the constraints?",
      role: interview.role || "Software Engineer",
    });
  }

  if (!Array.isArray(interview.transcript)) interview.transcript = [];
  interview.transcript.push({
    role: "ai",
    content: `💬 Clarification: ${clarificationText}`,
    questionId: currentQ.questionId,
    entryType: "clarification",
    timestamp: new Date(),
  });
  await interview.save();

  return { clarification: clarificationText, message: clarificationText };
};

/**
 * Internal: advance to next question or complete interview.
 * Builds a conversational transition so the AI flows naturally.
 */
const _advanceToNext = async (interview, idx, evaluation, wasSkipped = false) => {
  const nextIdx = idx + 1;
  interview.currentQuestionIndex = nextIdx;

  if (nextIdx >= interview.questions.length) {
    // ── Interview complete ───────────────────────────────────────
    interview.status = "completed";
    interview.completedAt = new Date();
    interview.totalTimeTaken = Math.round(
      (interview.completedAt - (interview.startedAt || interview.completedAt)) / 1000
    );
    await interview.save();

    buildReport(interview._id).catch((e) =>
      console.error("Report generation error:", e.message)
    );

    // Natural closing message
    const closingMessages = [
      "And that wraps it up! You did great — thank you so much for your time. I'll get your detailed report ready shortly.",
      "That's all from my side. Really enjoyed chatting with you today. Your report will be ready in just a moment!",
      "And we're done! Thank you for a really engaging conversation. I'll have your full performance report ready shortly.",
      "Perfect, that's everything I had for you. Great effort throughout — your report is being generated now!",
    ];
    const closingIdx = Math.floor(Math.random() * closingMessages.length);

    interview.transcript.push({
      role: "ai",
      content: closingMessages[closingIdx],
      entryType: "closing",
      timestamp: new Date(),
    });
    await interview.save();

    return {
      action: "complete",
      evaluation: evaluation ? {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
      } : null,
      message: closingMessages[closingIdx],
    };
  } else {
    // ── Next question — with natural conversational bridge ────────
    const nextQuestion = interview.questions[nextIdx];
    nextQuestion.status = "active";
    nextQuestion.startedAt = new Date();

    // Build a conversational question (with transition phrase)
    const conversationalQ = buildConversationalQuestion(nextQuestion, evaluation, wasSkipped);

    // Store conversational version for TTS but keep raw question for evaluation
    nextQuestion._conversationalText = conversationalQ;

    if (!Array.isArray(interview.transcript)) interview.transcript = [];
    interview.transcript.push({
      role: "ai",
      content: conversationalQ,
      questionId: nextQuestion.questionId,
      entryType: "question",
      timestamp: new Date(),
    });

    await interview.save();

    return {
      action: "next",
      nextQuestion: {
        ...(nextQuestion.toObject ? nextQuestion.toObject() : nextQuestion),
        // Override display text with conversational version
        conversationalText: conversationalQ,
      },
      questionIndex: nextIdx,
      totalQuestions: interview.questions.length,
      prevEvaluation: evaluation ? {
        score: evaluation.score,
        shortFeedback: evaluation.shortFeedback,
        brutalFeedback: evaluation.brutalFeedback,
        pacing: evaluation.pacing,
      } : null,
      skipUsed: interview.skipUsed,
      wasSkipped,
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
  interview.violationCount = (typeof interview.violationCount === "number" && !isNaN(interview.violationCount) ? interview.violationCount : 0) + 1;

  let autoSubmitted = false;

  if (interview.violationCount >= MAX_VIOLATIONS) {
    interview.status = "auto_submitted";
    interview.autoSubmitted = true;
    interview.completedAt = new Date();
    interview.totalTimeTaken = Math.round(
      (interview.completedAt - (interview.startedAt || interview.completedAt)) / 1000
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
  provideHint,
  clarifyQuestion,
  recordViolation,
  updateQuestionTimer,
};
