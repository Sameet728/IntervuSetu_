const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = (highQuality = false) =>
  genAI.getGenerativeModel({
    model: highQuality ? "gemini-2.5-flash" : "gemini-2.5-flash",
  });

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
 * Generate interview questions based on role, experience, tech stack, and interview type.
 */
const generateQuestions = async ({
  role,
  experienceLevel,
  techStack,
  count = 8,
  interviewType = "mixed",
  difficulty = "adaptive",
  resumeText = "",
}) => {
  const model = getModel(true);
  const mix = getQuestionMix(interviewType);

  const difficultyInstruction = difficulty === "adaptive"
    ? `Start with 1-2 easy questions to warm up, then progress to medium and hard.`
    : `All questions should be ${difficulty} difficulty.`;

  const prompt = `
You are an expert technical interviewer. Generate exactly ${count} interview questions for:

Role: ${role}
Experience Level: ${experienceLevel}
Tech Stack: ${techStack.join(", ")}
Interview Type: ${interviewType}
Difficulty: ${difficulty}

${resumeText ? `Candidate Resume Context:\n${resumeText}\nAsk highly personalized questions based on their resume experience and projects where appropriate.` : ""}

Question Type Distribution (approximate):
- Code Problems: ~${mix.code}%
- Theory/Concepts: ~${mix.theory}%
- Behavioral: ~${mix.behavioral}%
- HR: ~${mix.hr}%
- System Design: ~${mix.system_design}%

Rules:
${difficultyInstruction}
- Questions must be realistic, professional, and role-appropriate
- For code questions: include a clear problem statement
- For behavioral: use STAR-method prompts ("Tell me about a time...")
- For system design: focus on architecture and trade-offs
- Avoid generic/repetitive questions
- Each question must test a DIFFERENT topic/skill area
- Make questions progressively deeper in difficulty

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "questionId": "q1",
    "question": "...",
    "questionType": "code" | "theory" | "hr" | "system_design" | "behavioral",
    "difficulty": "easy" | "medium" | "hard",
    "expectedAnswer": "Brief outline of ideal answer",
    "topic": "topic name (e.g. React Hooks, System Design, etc.)"
  }
]
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const questions = JSON.parse(cleaned);

    return questions.map((q, idx) => ({
      ...q,
      questionId: q.questionId || `q${idx + 1}`,
    }));
  } catch (error) {
    throw new Error(`Question generation failed: ${error.message}`);
  }
};

/**
 * Evaluate a user's answer to a question.
 * Returns score (0–10), feedback, ideal answer, strengths, weaknesses.
 */
const evaluateAnswer = async ({
  question,
  originalMainQuestion = null,
  questionType,
  expectedAnswer,
  userAnswer,
  code = null,
  contextSummary = "",
  recentQA = [],
}) => {
  const model = getModel(false);

  const recentContext = recentQA
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA: ${qa.answer}`)
    .join("\n\n");

  let evaluationCriteria = "";
  if (questionType === "code") {
    evaluationCriteria = `
Evaluate on:
1. Code Correctness (0–10): Does it solve the problem correctly?
2. Time/Space Complexity (0–10): Is it efficient? Did they consider edge cases?
3. Code Quality (0–10): Readability, naming conventions, structure
4. Explanation (0–10): Can the candidate explain their approach and trade-offs?
Final score = weighted average (correctness 40%, complexity 25%, quality 20%, explanation 15%).
    `;
  } else if (questionType === "theory") {
    evaluationCriteria = `
Evaluate on:
1. Technical Accuracy (0–10): Is the answer factually correct?
2. Depth of Understanding (0–10): Do they understand the WHY, not just the WHAT?
3. Clarity (0–10): Can they articulate complex concepts clearly?
Final score = weighted average.
    `;
  } else if (questionType === "system_design") {
    evaluationCriteria = `
Evaluate on:
1. Problem Understanding (0–10): Did they clarify requirements?
2. Architecture (0–10): Appropriate components and design?
3. Scalability (0–10): Did they consider scale, bottlenecks, trade-offs?
4. Communication (0–10): Clear explanation of decisions?
Final score = weighted average.
    `;
  } else {
    evaluationCriteria = `
Evaluate on:
1. Relevance (0–10): Does it directly answer the question?
2. Communication (0–10): Structured, clear, and professional?
3. Examples/Evidence (0–10): Use of concrete, specific examples?
Final score = weighted average.
    `;
  }

  const prompt = `
You are a strict but fair interviewer evaluating a candidate's answer.

=== CONTEXT SUMMARY ===
${contextSummary || "No prior context"}

=== RECENT CONVERSATION ===
${recentContext || "This is the first question"}

=== CURRENT EVALUATION ===
${originalMainQuestion ? `Original Main Question Context: ${originalMainQuestion}\n` : ""}Question: ${question}
Question Type: ${questionType}
Expected Answer Outline: ${expectedAnswer}

Candidate's Answer: ${userAnswer}
${code ? `\nCandidate's Code:\n\`\`\`\n${code}\n\`\`\`` : ""}

${evaluationCriteria}

Return ONLY valid JSON (no markdown):
{
  "score": <number 0-10>,
  "shortFeedback": "<1-2 short sentences of feedback directly addressing the answer>",
  "brutalFeedback": "<1 blunt, brutal, but honest sentence about what they missed or did wrong>",
  "strength": "<main strength observed>",
  "weakness": "<main weakness observed>",
  "idealAnswer": "<concise ideal answer in 2-4 sentences>"
}
`;

  try {
    console.log("🤖 Calling Gemini API for evaluation...");
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API timeout after 30 seconds")), 30000)
      ),
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    console.log("✅ Gemini API response received");
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ Gemini API error:", error.message);
    throw new Error(`Answer evaluation failed: ${error.message}`);
  }
};

/**
 * Generate a context-aware follow-up question
 */
const generateFollowup = async ({
  question,
  questionType,
  userAnswer,
  code = null,
  previousFollowups = [],
  contextSummary = "",
}) => {
  const model = getModel(false);

  const prevFollowupsText = previousFollowups
    .map((f, i) => `Follow-up ${i + 1}: ${f.question}\nAnswer: ${f.answer}`)
    .join("\n\n");

  const prompt = `
You are a technical interviewer probing deeper into a candidate's answer.

Context Summary: ${contextSummary || "N/A"}

Original Question: ${question}
Question Type: ${questionType}
Candidate's Answer: ${userAnswer}
${code ? `\nCode Submitted:\n\`\`\`\n${code}\n\`\`\`` : ""}

Previous Follow-ups:
${prevFollowupsText || "None yet"}

Generate ONE targeted follow-up question that:
- Probes a specific weakness or gap in their answer
- Is not repetitive of previous follow-ups
- Is direct and specific
- For code: ask about edge cases, complexity, or alternative approaches
- For behavioral: ask for more specific examples or outcomes
- For theory: ask them to go deeper or explain a specific part

Return ONLY valid JSON:
{
  "followupQuestion": "<the follow-up question>",
  "reason": "<why you're asking this>"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Follow-up generation failed: ${error.message}`);
  }
};

/**
 * Generate compressed long-term summary for context memory
 */
const generateSummary = async ({ existingSummary, newQA }) => {
  const model = getModel(false);

  const prompt = `
You are compressing an interview conversation into a concise summary for context memory.

Existing Summary:
${existingSummary || "None"}

New Q&A to incorporate:
Question: ${newQA.question}
Answer: ${newQA.answer}
Score: ${newQA.score}/10

Generate an updated summary that:
- Captures candidate's demonstrated skills and knowledge
- Notes weak areas and what they missed
- Keeps it under 200 words
- Retains only what's relevant for future evaluation

Return ONLY plain text summary (no JSON, no markdown).
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Summary generation error:", error.message);
    return existingSummary; // Graceful fallback
  }
};

/**
 * Generate final interview report using all data
 */
const generateFinalReport = async ({
  role,
  experienceLevel,
  techStack,
  interviewType = "mixed",
  questionsData,
  longTermSummary,
}) => {
  const model = getModel(true);

  const questionsSummary = questionsData
    .map(
      (q, i) =>
        `Q${i + 1} [${q.questionType}/${q.difficulty}]: ${q.question}
Score: ${q.score ?? "N/A"}/10 | Time: ${q.timeTaken}s
Feedback: ${q.feedback || "N/A"}`
    )
    .join("\n\n");

  const prompt = `
You are generating a comprehensive interview performance report.

Candidate Profile:
- Role: ${role}
- Experience Level: ${experienceLevel}
- Tech Stack: ${techStack.join(", ")}
- Interview Type: ${interviewType}

Interview Summary: ${longTermSummary}

Per-Question Performance:
${questionsSummary}

Generate a structured performance report. Return ONLY valid JSON:
{
  "overallScore": <0-10>,
  "communicationScore": <0-10>,
  "technicalScore": <0-10>,
  "problemSolvingScore": <0-10>,
  "hrScore": <0-10>,
  "codeQualityScore": <0-10 or null if no code questions>,
  "overallFeedback": "<3-4 sentence overall assessment>",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendation": "strong_hire" | "hire" | "borderline" | "no_hire" | "strong_no_hire",
  "improvementAreas": ["area1: specific action", "area2: specific action"],
  "topicsToStudy": ["topic1", "topic2", "topic3", "topic4", "topic5"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Report generation failed: ${error.message}`);
  }
};

/**
 * Generate interview greeting message
 */
const generateGreeting = async ({ name, role, totalQuestions, interviewType = "mixed" }) => {
  const model = getModel(false);

  const typeDesc = {
    technical: "technical coding and concepts",
    hr: "HR and culture fit",
    behavioral: "behavioral and situational",
    system_design: "system design and architecture",
    mixed: "mixed format combining technical, behavioral, and HR",
  }[interviewType] || "comprehensive";

  const prompt = `
Generate a professional, warm, and encouraging interview greeting for:
- Candidate name: ${name || "the candidate"}
- Role: ${role}
- Interview type: ${typeDesc}
- Total questions: ${totalQuestions}

Keep it concise (2-3 sentences). Mention the role, interview type, number of questions, and wish them luck.
Sound like a professional but friendly interviewer. Return ONLY plain text.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return `Hello ${name || ""}! Welcome to your ${role} ${interviewType} interview. We have ${totalQuestions} questions prepared for you today. Take your time, speak clearly, and good luck!`;
  }
};

/**
 * Generate candidate tags, badge, and strength/weakness summaries for org leaderboard.
 */
const generateCandidateTags = async ({
  role,
  overallScore,
  technicalScore,
  communicationScore,
  problemSolvingScore,
  strengths = [],
  weaknesses = [],
  timeTaken = 0,
  interviewType = "mixed",
}) => {
  const model = getModel(false);

  const prompt = `
You are analyzing an interview candidate's performance to generate concise tags and summaries for an HR leaderboard.

Role: ${role}
Interview Type: ${interviewType}
Overall Score: ${overallScore}/10
Technical Score: ${technicalScore}/10
Communication Score: ${communicationScore}/10
Problem Solving Score: ${problemSolvingScore}/10
Time Taken: ${Math.round(timeTaken / 60)} minutes
Top Strengths: ${strengths.slice(0, 3).join(", ")}
Main Weaknesses: ${weaknesses.slice(0, 3).join(", ")}

Generate:
1. Strengths list
2. Weaknesses list
3. A concise summary

Return ONLY valid JSON:
{
  "strengths": ["tag1", "tag2"],
  "weaknesses": ["tag1", "tag2"],
  "summary": "..."
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    // Graceful fallback
    return {
      strengths: strengths.slice(0, 2).map(s => s.trim()),
      weaknesses: weaknesses.slice(0, 2).map(s => s.trim()),
      summary: strengths[0] || "Solid performance overall."
    };
  }
};

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateFollowup,
  generateSummary,
  generateFinalReport,
  generateGreeting,
  generateCandidateTags,
};

