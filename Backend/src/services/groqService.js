/**
 * Groq AI Service for ultra-fast Question Generation & Final Report Synthesis.
 * Powered by Groq LPUs (Llama 3.3 70B / Llama 3.1 8B).
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const FALLBACK_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];

/**
 * Get active Groq API Key from options, process.env, or user settings
 */
function getApiKey(customKey) {
  if (customKey && customKey.trim().startsWith("gsk_")) {
    return customKey.trim();
  }
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().startsWith("gsk_")) {
    return process.env.GROQ_API_KEY.trim();
  }
  return customKey || process.env.GROQ_API_KEY || "";
}

/**
 * Test connectivity with Groq API key
 */
async function testGroqKey(apiKey) {
  const key = getApiKey(apiKey);
  if (!key) {
    return { success: false, message: "No Groq API key provided" };
  }

  try {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error?.message || `Groq API returned HTTP ${res.status}`,
      };
    }

    return { success: true, message: "Groq API connected successfully!" };
  } catch (error) {
    return { success: false, message: "Network error connecting to Groq: " + error.message };
  }
}

/**
 * Generate interview questions using Groq Cloud LPU
 */
async function generateQuestionsWithGroq({
  role = "Software Engineer",
  experienceLevel = "mid",
  techStack = [],
  count = 6,
  interviewType = "mixed",
  difficulty = "adaptive",
  resumeText = "",
  apiKey = null,
  model = DEFAULT_MODEL,
  codingQCount = 1,  // number of coding questions to include
}) {
  const key = getApiKey(apiKey);
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured. Please add it to .env or your settings.");
  }

  const techStr = Array.isArray(techStack) && techStack.length ? techStack.join(", ") : role;
  const countNum = Math.min(Math.max(Number(count) || 6, 3), 15);
  
  // Exclude the self-intro question (it's injected separately)
  const nonIntroCount = countNum - 1;
  const actualCodingCount = Math.min(codingQCount, interviewType === "hr" || interviewType === "behavioral" ? 0 : 2);
  const nonCodingCount = Math.max(nonIntroCount - actualCodingCount, 1);

  const prompt = `You are a Principal Technical Interviewer at a top-tier tech firm.
Generate exactly ${nonIntroCount} interview questions for:
- Role: ${role}
- Experience: ${experienceLevel}
- Tech Stack: ${techStr}
- Interview Type: ${interviewType}
- Difficulty: ${difficulty}
${resumeText ? `- Candidate Resume Context: ${resumeText.slice(0, 1500)}` : ""}

IMPORTANT STRUCTURE RULES:
- Include exactly ${actualCodingCount} coding question(s) (type: "code"). Place them last.
- Include ${Math.ceil(nonCodingCount * 0.15)} HR behavioral question(s) (type: "hr") right after introduction
- Include ${Math.ceil(nonCodingCount * 0.25)} behavioral question(s) (type: "behavioral")
- Fill the rest with technical theory and system design questions
- Do NOT include a self-introduction question (it will be added separately)
- Progressive difficulty: warm-up HR → behavioral → technical → coding

Rules:
1. Provide a progressive difficulty arc (from foundational principles to deep architecture/edge-cases).
2. For coding/theory: include specific, real-world engineering scenarios.
3. For behavioral/hr: use STAR format scenarios.
4. Output STRICTLY a valid JSON array and nothing else. No Markdown fences, no preface, no trailing text.

Format:
[
  {
    "questionId": "q1",
    "question": "Detailed question string",
    "questionType": "theory" | "code" | "system_design" | "behavioral" | "hr",
    "difficulty": "easy" | "medium" | "hard",
    "expectedAnswer": "Brief bulleted ideal technical response",
    "topic": "Specific Topic Name"
  }
]`;

  const candidateModels = [model, ...FALLBACK_MODELS].filter((m, i, arr) => m && arr.indexOf(m) === i);
  let lastError = null;

  for (const m of candidateModels) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: m,
          messages: [
            {
              role: "system",
              content: "You are an expert technical interviewer that outputs strictly raw JSON arrays of questions.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Groq API error ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();

      const questions = JSON.parse(cleaned);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Groq returned invalid question array format");
      }

      return questions.map((q, idx) => ({
        questionId: q.questionId || `q${idx + 1}`,
        question: q.question,
        questionType: q.questionType || "theory",
        difficulty: q.difficulty || "medium",
        expectedAnswer: q.expectedAnswer || "",
        topic: q.topic || role,
      }));
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Groq model '${m}' failed (${err.message}). Trying fallback model...`);
    }
  }

  throw lastError || new Error("All Groq candidate models failed");

  return questions.map((q, idx) => ({
    questionId: q.questionId || `q${idx + 1}`,
    question: q.question,
    questionType: q.questionType || "theory",
    difficulty: q.difficulty || "medium",
    expectedAnswer: q.expectedAnswer || "",
    topic: q.topic || role,
  }));
}

/**
 * Generate comprehensive final scorecard and report using Groq
 */
async function generateFinalReportWithGroq({
  role = "Software Engineer",
  experienceLevel = "mid",
  techStack = [],
  interviewType = "mixed",
  questionsData = [],
  longTermSummary = "",
  apiKey = null,
  model = DEFAULT_MODEL,
}) {
  const key = getApiKey(apiKey);
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const techStr = Array.isArray(techStack) && techStack.length ? techStack.join(", ") : role;

  const prompt = `You are a Senior Bar Raiser and Technical Hiring Committee Chair.
Synthesize a comprehensive final interview performance evaluation report for:
- Role: ${role} (${experienceLevel})
- Tech Stack: ${techStr}
- Interview Type: ${interviewType}

Candidate Question Performance Data:
${JSON.stringify(questionsData, null, 2)}

${longTermSummary ? `Conversation Summary Notes:\n${longTermSummary}\n` : ""}

Evaluate deeply and output STRICTLY a valid JSON object matching this exact schema:
{
  "overallScore": <number 0 to 10>,
  "technicalScore": <number 0 to 10>,
  "communicationScore": <number 0 to 10>,
  "problemSolvingScore": <number 0 to 10>,
  "hrScore": <number 0 to 10>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<area for improvement 1>", "<area for improvement 2>", "<area for improvement 3>"],
  "overallFeedback": "<detailed multi-paragraph breakdown of candidate's technical precision, depth, and communication style>",
  "recommendation": "strong_hire" | "hire" | "leaning_hire" | "leaning_no_hire" | "no_hire",
  "topicsToStudy": ["<specific topic 1>", "<specific topic 2>", "<specific topic 3>"],
  "improvementAreas": ["<actionable improvement 1>", "<actionable improvement 2>"],
  "skillBreakdown": [
    { "skill": "Core Language & Concepts", "score": <0-10>, "feedback": "<1 sentence>" },
    { "skill": "System Architecture & Scalability", "score": <0-10>, "feedback": "<1 sentence>" },
    { "skill": "Problem Solving & Trade-offs", "score": <0-10>, "feedback": "<1 sentence>" },
    { "skill": "Clarity & Communication", "score": <0-10>, "feedback": "<1 sentence>" }
  ]
}

No markdown wrappers. Output only the raw JSON.`;

  const candidateModels = [model, ...FALLBACK_MODELS].filter((m, i, arr) => m && arr.indexOf(m) === i);
  let lastError = null;

  for (const m of candidateModels) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: m,
          messages: [
            {
              role: "system",
              content: "You are an objective, rigorous tech hiring evaluator that outputs strictly raw JSON.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Groq API error ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content || "";
      const cleaned = rawText.replace(/```json|```/g, "").trim();

      const parsed = JSON.parse(cleaned);
      return {
        overallScore: typeof parsed.overallScore === "number" ? parsed.overallScore : 8,
        technicalScore: typeof parsed.technicalScore === "number" ? parsed.technicalScore : 8,
        communicationScore: typeof parsed.communicationScore === "number" ? parsed.communicationScore : 8,
        problemSolvingScore: typeof parsed.problemSolvingScore === "number" ? parsed.problemSolvingScore : 8,
        hrScore: typeof parsed.hrScore === "number" ? parsed.hrScore : 8,
        overallFeedback: parsed.overallFeedback || parsed.detailedFeedback || "Candidate completed the interview successfully.",
        recommendation: (parsed.recommendation || parsed.hiringRecommendation || "hire").toLowerCase().replace(/\s+/g, "_"),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        topicsToStudy: Array.isArray(parsed.topicsToStudy) ? parsed.topicsToStudy : (Array.isArray(parsed.recommendations) ? parsed.recommendations : []),
        improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : (Array.isArray(parsed.weaknesses) ? parsed.weaknesses : []),
        skillBreakdown: Array.isArray(parsed.skillBreakdown) ? parsed.skillBreakdown : [],
      };
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Groq model '${m}' failed in report generation (${err.message}). Trying fallback model...`);
    }
  }

  throw lastError || new Error("All Groq candidate models failed in report generation");
}

module.exports = {
  generateQuestionsWithGroq,
  generateFinalReportWithGroq,
  testGroqKey,
  getApiKey,
};
