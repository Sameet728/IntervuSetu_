const { z } = require("zod");

let ChatGoogleGenerativeAI, ChatPromptTemplate;
let DynamicStructuredTool;
try {
  const langchainGenai = require("@langchain/google-genai");
  ChatGoogleGenerativeAI = langchainGenai.ChatGoogleGenerativeAI;
  const langchainPrompts = require("@langchain/core/prompts");
  ChatPromptTemplate = langchainPrompts.ChatPromptTemplate;
  const langchainTools = require("@langchain/core/tools");
  DynamicStructuredTool = langchainTools.DynamicStructuredTool;
} catch (e) {
  console.log("ℹ️ LangChain not available, using local AI fallback exclusively.");
}

const {
  evaluateAnswerFallback,
  generateFollowupFallback,
  generateHintFallback,
  clarifyQuestionFallback,
  classifyCandidateIntent,
  generateFinalReportFallback,
} = require("./localAIService");

// ─── ZOD STRUCTURED OUTPUT SCHEMAS ──────────────────────────────────
const EvaluationSchema = z.object({
  score: z.number().min(0).max(10).describe("Numerical score between 0 and 10"),
  shortFeedback: z.string().describe("1-2 concise sentences summarizing what the candidate got right"),
  brutalFeedback: z.string().describe("1 blunt, honest sentence about what they missed"),
  strength: z.string().describe("Primary technical or architectural strength demonstrated"),
  weakness: z.string().describe("Primary technical gap or blindspot"),
  idealAnswer: z.string().describe("Concise 2-3 sentence ideal answer"),
});

const FollowupSchema = z.object({
  followupQuestion: z.string().describe("Sharp, challenging technical follow-up question"),
  focusArea: z.string().optional().describe("Area probed"),
});

const FinalReportSchema = z.object({
  overallScore: z.number().min(0).max(10),
  communicationScore: z.number().min(0).max(10),
  technicalScore: z.number().min(0).max(10),
  problemSolvingScore: z.number().min(0).max(10),
  hrScore: z.number().min(0).max(10),
  codeQualityScore: z.number().nullable().optional(),
  overallFeedback: z.string().describe("Comprehensive 3-4 sentence performance synthesis"),
  strengths: z.array(z.string()).min(2),
  weaknesses: z.array(z.string()).min(2),
  recommendation: z.enum(["strong_hire", "hire", "borderline", "no_hire"]),
  improvementAreas: z.array(z.string()).min(2),
  topicsToStudy: z.array(z.string()).min(2),
});

// ─── LANGCHAIN MODEL INITIALIZER ────────────────────────────────────
function getLangChainModel(temperature = 0.3) {
  if (!ChatGoogleGenerativeAI) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("your_")) {
    return null;
  }

  try {
    return new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-1.5-flash",
      temperature,
      maxOutputTokens: 1024,
    });
  } catch (err) {
    console.warn("⚠️ Failed to initialize LangChain ChatGoogleGenerativeAI:", err.message);
    return null;
  }
}

// ─── SLIDING WINDOW CONTEXT MEMORY MANAGER ─────────────────────────
class InterviewContextMemory {
  static formatRecentContext(recentQA = [], windowSize = 3) {
    if (!recentQA || recentQA.length === 0) return "No previous questions in this session.";
    const recentSlice = recentQA.slice(-windowSize);
    return recentSlice
      .map((qa, i) => `[Previous Q${i + 1}]: ${qa.question}\n[Candidate Answer]: ${qa.answer}`)
      .join("\n\n");
  }
}

// ─── 1. EVALUATE ANSWER ──────────────────────────────────────────────
async function evaluateAnswerWithLangChain({
  question,
  originalMainQuestion = null,
  questionType = "technical",
  expectedAnswer = "",
  topic = "",
  userAnswer = "",
  code = null,
  contextSummary = "",
  recentQA = [],
  role = "Software Engineer",
  techStack = [],
}) {
  // Always try local first (fastest, $0 cost, unlimited)
  try {
    const localResult = await evaluateAnswerFallback({ question, expectedAnswer, topic, userAnswer, code, role, techStack });
    if (localResult && (localResult.score !== undefined)) {
      console.log(`⚡ Evaluated via on-device AI (${localResult.score}/10)`);
      return localResult;
    }
  } catch (e) {
    console.log("ℹ️ Local AI offline, trying LangChain Gemini fallback");
  }

  // LangChain Gemini fallback
  const model = getLangChainModel(0.2);
  if (!model) {
    return await evaluateAnswerFallback({ question, expectedAnswer, topic, userAnswer, code, role, techStack });
  }

  if (!ChatPromptTemplate) {
    return await evaluateAnswerFallback({ question, expectedAnswer, topic, userAnswer, code, role, techStack });
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a strict, senior technical bar raiser evaluating a candidate's answer for a {role} position.
Evaluate depth, practical tradeoffs, and operational edge cases. Always return a structured response.`
    ],
    [
      "human",
      `Question: {question}
Question Type: {questionType}
Expected Key Points: {expectedAnswer}

Candidate Answer: {userAnswer}
{codeBlock}

Provide an objective evaluation.`
    ]
  ]);

  try {
    const structuredLlm = model.withStructuredOutput(EvaluationSchema);
    const chain = prompt.pipe(structuredLlm);
    const codeBlock = code ? `\nCode Submitted:\n\`\`\`\n${code}\n\`\`\`` : "";

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LangChain evaluation timeout (10s)")), 10000)
    );

    const evaluation = await Promise.race([
      chain.invoke({
        role,
        question: originalMainQuestion ? `${originalMainQuestion} (Follow-up: ${question})` : question,
        questionType,
        expectedAnswer: expectedAnswer || "Standard production best practices",
        userAnswer: userAnswer || "No answer provided",
        codeBlock,
      }),
      timeoutPromise
    ]);

    if (!evaluation || evaluation.score === undefined) {
      throw new Error("Empty evaluation returned from Gemini");
    }

    console.log("✅ LangChain evaluation complete (Score:", evaluation.score, ")");
    return evaluation;
  } catch (err) {
    console.warn(`⚠️ LangChain evaluation failed (${err.message}). Using Local AI.`);
    return await evaluateAnswerFallback({ question, userAnswer, code, role, techStack });
  }
}

// ─── 2. GENERATE FOLLOW-UP ───────────────────────────────────────────
async function generateFollowupWithLangChain({
  question,
  userAnswer = "",
  code = null,
  previousFollowups = [],
  role = "Software Engineer",
  techStack = [],
  pacing = null,
}) {
  // Always try local first (includes code context for coding questions and pacing)
  try {
    const localFollowup = await generateFollowupFallback({ question, userAnswer, code: code || "", role, techStack, pacing });
    if (localFollowup) {
      console.log(`⚡ Cross-question generated via on-device AI`);
      // Normalize: if it's already a string, wrap it; if it's an object, return as-is
      if (typeof localFollowup === "string") {
        return { followupQuestion: localFollowup };
      }
      return localFollowup;
    }
  } catch (e) {
    console.log("ℹ️ Local AI offline, trying LangChain Gemini fallback");
  }

  const model = getLangChainModel(0.4);
  if (!model || !ChatPromptTemplate) {
    const fallback = await generateFollowupFallback({ question, userAnswer, code: code || "", role, techStack, pacing });
    return typeof fallback === "string" ? { followupQuestion: fallback } : fallback;
  }

  const isShort = pacing?.targetFollowupSize === "short" || pacing?.urgency === "tight" || pacing?.urgency === "critical";
  const maxWords = pacing?.maxFollowupWords || (isShort ? 14 : 25);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert technical interviewer for a {role}.
${isShort ? `TIME IS LIMITED. Ask ONE very concise, rapid-fire probing question (MUST BE UNDER ${maxWords} WORDS). Avoid lengthy preambles.` : `Generate ONE sharp probing follow-up question to test edge cases or depth. Keep it under ${maxWords} words.`}
Do not repeat previous questions.`
    ],
    [
      "human",
      `Original Question: {question}
Candidate's Answer: {userAnswer}
Previous Follow-ups: {prevFollowups}

Generate the follow-up question.`
    ]
  ]);

  try {
    const structuredLlm = model.withStructuredOutput(FollowupSchema);
    const chain = prompt.pipe(structuredLlm);

    const prevFollowupsStr = previousFollowups.length
      ? previousFollowups.map((f, i) => `${i + 1}. ${f.question}`).join("\n")
      : "None";

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("LangChain followup timeout (8s)")), 8000)
    );

    const res = await Promise.race([
      chain.invoke({ role, question, userAnswer, prevFollowups: prevFollowupsStr }),
      timeoutPromise
    ]);

    if (!res || !res.followupQuestion) {
      throw new Error("Empty followup returned");
    }

    return res;
  } catch (err) {
    console.warn(`⚠️ LangChain follow-up failed (${err.message}). Using Local AI.`);
    const fallback = await generateFollowupFallback({ question, userAnswer, role });
    return typeof fallback === "string" ? { followupQuestion: fallback } : fallback;
  }
}

// ─── 3. GENERATE FINAL REPORT ────────────────────────────────────────
async function generateFinalReportWithLangChain({
  role = "Software Engineer",
  techStack = [],
  questionsData = [],
  overallSummary = "",
}) {
  const model = getLangChainModel(0.2);

  if (!model || !ChatPromptTemplate) {
    console.log("ℹ️ LangChain: Using Local AI Engine to compile final report");
    return generateFinalReportFallback({ role, techStack, questionsData });
  }

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are the Chief Bar Raiser at a top technology company.
Review the candidate's complete interview transcript and compile a comprehensive hiring report.
Be thorough, objective, and provide actionable feedback. Always return a complete structured response.`
    ],
    [
      "human",
      `Role: {role}
Required Tech Stack: {techStack}

Transcript & Performance Summary:
{transcript}

Session Overview: {overallSummary}

Output the finalized comprehensive evaluation report.`
    ]
  ]);

  try {
    const structuredLlm = model.withStructuredOutput(FinalReportSchema);
    const chain = prompt.pipe(structuredLlm);

    const transcriptText = questionsData
      .map((q, i) => `Q${i + 1} (${q.topic || q.questionType}): ${q.question}\nAnswer: ${q.userAnswer || "N/A"}\nScore: ${q.score || 7}/10\nFeedback: ${q.shortFeedback || "N/A"}`)
      .join("\n\n---\n\n");

    const report = await chain.invoke({
      role,
      techStack: Array.isArray(techStack) ? techStack.join(", ") : techStack,
      transcript: transcriptText,
      overallSummary: overallSummary || "Completed technical interview assessment",
    });

    if (!report || report.overallScore === undefined) {
      throw new Error("Empty report returned from Gemini");
    }

    console.log("✅ LangChain structured final report compiled (Overall Score:", report.overallScore, ")");
    return report;
  } catch (err) {
    console.warn(`⚠️ LangChain final report failed (${err.message}). Falling back to local report compiler.`);
    return generateFinalReportFallback({ role, techStack, questionsData });
  }
}

// ─── 4. LANGCHAIN CONVERSATIONAL TOOLS ──────────────────────────────
const repeatQuestionTool = DynamicStructuredTool ? new DynamicStructuredTool({
  name: "repeat_question",
  description: "Use this tool when the candidate asks to repeat, re-state, or re-read the active interview question.",
  schema: z.object({
    questionText: z.string().describe("The active question to repeat"),
  }),
  func: async ({ questionText }) => {
    return {
      action: "repeat",
      message: `Sure! Let me repeat the question: ${questionText}`,
    };
  },
}) : null;

const provideHintTool = DynamicStructuredTool ? new DynamicStructuredTool({
  name: "provide_hint",
  description: "Use this tool when the candidate asks for a hint or clue on the current question.",
  schema: z.object({
    question: z.string(),
    code: z.string().optional(),
    role: z.string().optional(),
  }),
  func: async ({ question, code = "", role = "Software Engineer" }) => {
    const hint = await generateHintFallback({ question, code, role });
    return {
      action: "hint",
      hint,
      message: `Here is a hint to guide you: ${hint}`,
    };
  },
}) : null;

const clarifyQuestionTool = DynamicStructuredTool ? new DynamicStructuredTool({
  name: "clarify_question",
  description: "Use this tool when the candidate asks a clarifying question about constraints, input data, or requirements.",
  schema: z.object({
    question: z.string(),
    query: z.string(),
    role: z.string().optional(),
  }),
  func: async ({ question, query, role = "Software Engineer" }) => {
    const clarification = await clarifyQuestionFallback({ question, query, role });
    return {
      action: "clarify",
      clarification,
      message: clarification,
    };
  },
}) : null;

const evaluateCodeAndAnswerTool = DynamicStructuredTool ? new DynamicStructuredTool({
  name: "evaluate_code_and_answer",
  description: "Use this tool to evaluate the candidate's code implementation, time/space complexity, and verbal explanation.",
  schema: z.object({
    question: z.string(),
    userAnswer: z.string(),
    code: z.string().optional(),
    role: z.string().optional(),
    techStack: z.array(z.string()).optional(),
  }),
  func: async ({ question, userAnswer, code = "", role = "Software Engineer", techStack = [] }) => {
    return await evaluateAnswerWithLangChain({
      question,
      userAnswer,
      code,
      role,
      techStack,
    });
  },
}) : null;

/**
 * LangChain Candidate Interaction Router
 * Determines if user utterance is a conversational request (repeat, hint, clarify, wait, skip)
 * or an actual technical answer/code submission.
 */
async function handleCandidateInteraction({
  userAnswer = "",
  code = null,
  currentQuestion = null,
  role = "Software Engineer",
  techStack = [],
}) {
  const questionText = currentQuestion?.question || "";
  const { intent, query } = classifyCandidateIntent(userAnswer);

  if (intent === "repeat") {
    if (repeatQuestionTool) {
      return await repeatQuestionTool.invoke({ questionText });
    }
    return {
      action: "repeat",
      message: `Of course! Here is the question again: ${questionText}`,
    };
  }

  if (intent === "hint") {
    if (provideHintTool) {
      return await provideHintTool.invoke({ question: questionText, code: code || "", role });
    }
    const hint = await generateHintFallback({ question: questionText, code: code || "", role });
    return {
      action: "hint",
      hint,
      message: `Here is a hint to guide you: ${hint}`,
    };
  }

  if (intent === "clarify") {
    if (clarifyQuestionTool) {
      return await clarifyQuestionTool.invoke({ question: questionText, query: query || userAnswer, role });
    }
    const clarification = await clarifyQuestionFallback({ question: questionText, query: query || userAnswer, role });
    return {
      action: "clarify",
      clarification,
      message: clarification,
    };
  }

  if (intent === "wait") {
    return {
      action: "wait",
      message: "No problem at all — take your time! I'm here whenever you're ready to share your thoughts.",
    };
  }

  if (intent === "skip") {
    return {
      action: "skip",
      message: "No problem, let's move on to the next question.",
    };
  }

  // Candidate is submitting a technical answer / code
  return {
    action: "answer",
  };
}

module.exports = {
  EvaluationSchema,
  FollowupSchema,
  FinalReportSchema,
  InterviewContextMemory,
  evaluateAnswerWithLangChain,
  generateFollowupWithLangChain,
  generateFinalReportWithLangChain,
  repeatQuestionTool,
  provideHintTool,
  clarifyQuestionTool,
  evaluateCodeAndAnswerTool,
  handleCandidateInteraction,
};
