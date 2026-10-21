const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  generateQuestionsFallback,
  evaluateAnswerFallback,
  generateFollowupFallback,
  generateFinalReportFallback,
} = require("./localAIService");
const {
  evaluateAnswerWithLangChain,
  generateFollowupWithLangChain,
  generateFinalReportWithLangChain,
  handleCandidateInteraction,
} = require("./langchainService");
const {
  generateQuestionsWithGroq,
  generateFinalReportWithGroq,
  testGroqKey,
} = require("./groqService");

const hasValidKey = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("your_"));
const genAI = hasValidKey ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const getModel = (highQuality = false) => {
  if (!genAI) return null;
  return genAI.getGenerativeModel({
    model: highQuality ? "gemini-2.5-flash" : "gemini-2.5-flash",
  });
};

// ─── Question mix ratios by interview type ─────────────────────────────
const getQuestionMix = (interviewType) => {
  const mixes = {
    technical: { code: 40, theory: 40, behavioral: 10, hr: 5, system_design: 5 },
    hr: { code: 0, theory: 10, behavioral: 50, hr: 40, system_design: 0 },
    behavioral: { code: 5, theory: 10, behavioral: 70, hr: 15, system_design: 0 },
    system_design: { code: 10, theory: 20, behavioral: 10, hr: 5, system_design: 55 },
    mixed: { code: 30, theory: 35, behavioral: 20, hr: 10, system_design: 5 },
  };
  return mixes[interviewType] || mixes.mixed;
};

/**
 * Generate interview questions using Groq Cloud LPU or Local Qwen 2.5 0.5B
 */
const generateQuestions = async ({
  role,
  experienceLevel,
  techStack,
  count = 8,
  interviewType = "mixed",
  difficulty = "adaptive",
  resumeText = "",
  aiEngine = "groq", // "groq" or "qwen_local"
  groqApiKey = null,
  codingQCount = 1,
}) => {
  // Option A: Explicit Local Qwen 2.5 0.5B (100% On-Device / Offline Mode)
  if (aiEngine === "qwen_local" || aiEngine === "local") {
    console.log("⚡ Generating interview questions using Local Qwen 2.5 0.5B (On-Device)");
    return await generateQuestionsFallback({ role, count, techStack, difficulty, experienceLevel });
  }

  // Option B: Groq Cloud LPU (Ultra-fast)
  try {
    console.log("⚡ Generating interview questions using Groq Cloud LPU");
    return await generateQuestionsWithGroq({
      role,
      experienceLevel,
      techStack,
      count,
      interviewType,
      difficulty,
      resumeText,
      apiKey: groqApiKey,
      codingQCount,
    });
  } catch (groqErr) {
    console.warn(`⚠️ Groq question generation failed (${groqErr.message}). Falling back to Local Qwen 2.5.`);
    return await generateQuestionsFallback({ role, count, techStack, difficulty, experienceLevel });
  }
};

/**
 * Evaluate a user's answer to a question using LangChain + Zod structured output.
 */
const evaluateAnswer = async (params) => {
  return await evaluateAnswerWithLangChain(params);
};

/**
 * Generate a context-aware follow-up question using LangChain.
 */
const generateFollowup = async (params) => {
  return await generateFollowupWithLangChain(params);
};

/**
 * Generate conversation summary
 */
const generateSummary = async ({ existingSummary, newQA }) => {
  const model = getModel(false);
  if (!model) return existingSummary || "";

  const prompt = `
Compress interview conversation into a concise summary under 150 words:
Existing: ${existingSummary || "None"}
New Q: ${newQA.question}
New A: ${newQA.answer}
Score: ${newQA.score}/10
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return existingSummary || "";
  }
};

/**
 * Generate final interview report using Groq or Local Qwen 2.5 0.5B
 */
const generateFinalReport = async (params) => {
  const { aiEngine = (process.env.PREFERRED_AI_ENGINE || "qwen_local"), groqApiKey = null } = params;

  if (aiEngine === "qwen_local" || aiEngine === "local") {
    console.log("⚡ Generating final report using Local Qwen 2.5 0.5B (On-Device)");
    return await generateFinalReportFallback(params);
  }

  try {
    console.log("⚡ Generating final report using Groq Cloud LPU");
    return await generateFinalReportWithGroq({
      ...params,
      apiKey: groqApiKey,
    });
  } catch (groqErr) {
    console.warn(`⚠️ Groq report generation failed (${groqErr.message}). Falling back to Local Qwen 2.5.`);
    return await generateFinalReportFallback(params);
  }
};

/**
 * Generate a natural conversational interview greeting.
 * Sounds like a real human interviewer, not a robot announcing question counts.
 */
const generateGreeting = async ({ name, role, totalQuestions, interviewType = "mixed", duration = 45 }) => {
  const firstName = name ? name.split(" ")[0] : "there";
  
  // Natural conversational greetings array — rotated for variety
  const naturalGreetings = [
    `Hey ${firstName}! Great to finally connect. I'm really excited to chat with you today about the ${role} position. Before we dive into the technical stuff, I'd love to just hear a bit about you — maybe give me a quick intro, who you are, your background, and what's been keeping you busy lately?`,
    `Hi ${firstName}, thanks so much for making time today! I'm looking forward to our conversation. So, to kick things off — why don't you just tell me a little about yourself and your journey so far in your career?`,
    `Hello ${firstName}! Really glad you're here. We've got a good session planned for you today. Let's start easy — can you just walk me through who you are and what you've been working on recently?`,
    `Hey ${firstName}! Welcome, welcome. I always like to start these conversations naturally rather than jumping straight into questions. So tell me — in your own words, who are you and what brings you here today?`,
  ];

  const model = getModel(false);
  
  // Try Gemini for a personalized greeting
  if (model) {
    const prompt = `You are a friendly, professional technical interviewer starting a real job interview.
Write ONE natural opening statement (2-3 sentences max) for a ${role} interview with a candidate named ${firstName}.
- Sound warm and human, like you're genuinely happy to meet them
- End by asking them to introduce themselves naturally
- Do NOT mention question counts or session length
- Do NOT say "I am an AI"
- Keep it casual and welcoming, like a real interviewer would open`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text && text.length > 20) return text;
    } catch {
      // fall through
    }
  }

  // Deterministic fallback — pick based on interviewType
  const idx = Math.abs((firstName.length + role.length) % naturalGreetings.length);
  return naturalGreetings[idx];
};

const generateCandidateTags = async ({
  role,
  overallScore,
  technicalScore,
  communicationScore,
  strengths = [],
  weaknesses = [],
}) => {
  return {
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 2),
    summary: strengths[0] || "Solid performance overall.",
  };
};

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateFollowup,
  generateSummary,
  generateFinalReport,
  generateGreeting,
  generateCandidateTags,
  testGroqKey,
  handleCandidateInteraction,
};
