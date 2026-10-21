// Local intelligent interview engine (fallback when Gemini API key is missing or offline)
// Ensures 100% reliable local testing with realistic questions and evaluations.

const ROLE_TEMPLATES = {
  frontend: [
    {
      questionType: "theory",
      topic: "React Architecture",
      question: "How does the virtual DOM work in modern React, and how does reconciliation differ between fiber and concurrent rendering?",
      expectedAnswer: "Virtual DOM represents UI in memory. Fiber architecture introduces incremental rendering with fiber nodes as units of work, prioritized updates, and time-slicing.",
      difficulty: "medium",
    },
    {
      questionType: "code",
      topic: "Custom Hooks & Async",
      question: "Implement a custom hook `useDebounce(value, delay)` in React. How do you prevent memory leaks when components unmount before the timer fires?",
      expectedAnswer: "Return debounced value using useState and useEffect with setTimeout. Return cleanup function clearTimeout(timer) to prevent memory leaks.",
      difficulty: "medium",
    },
    {
      questionType: "system_design",
      topic: "Web Performance",
      question: "Walk me through how you would optimize Core Web Vitals (LCP, FID/INP, CLS) for a high-traffic e-commerce landing page.",
      expectedAnswer: "Optimize LCP with image preloading and critical CSS. Optimize INP by reducing JavaScript main thread blocking, code-splitting, and web workers. Optimize CLS by setting explicit image dimensions.",
      difficulty: "hard",
    },
    {
      questionType: "behavioral",
      topic: "Technical Conflict",
      question: "Tell me about a time you disagreed with a senior engineer or product manager on a technical architecture decision. How did you resolve it?",
      expectedAnswer: "STAR method: Situation, Task, Action (used benchmarks/prototypes to present objective data), Result (aligned on optimal tradeoff).",
      difficulty: "easy",
    },
    {
      questionType: "hr",
      topic: "Collaboration & Growth",
      question: "What keeps you passionate about frontend engineering, and how do you stay updated with rapidly changing web standards?",
      expectedAnswer: "Interest in user experience and developer ergonomics, following RFCs, building prototypes, community blogs, and measuring real-world user impact.",
      difficulty: "easy",
    },
  ],
  backend: [
    {
      questionType: "theory",
      topic: "Database Concurrency",
      question: "Explain the difference between optimistic and pessimistic locking in relational databases. In which real-world scenario would you choose each?",
      expectedAnswer: "Optimistic locking checks version timestamps at commit, ideal for high read/low contention. Pessimistic locking acquires row locks up front, best for high-contention financial transactions.",
      difficulty: "medium",
    },
    {
      questionType: "code",
      topic: "Algorithms & API Design",
      question: "Design an in-memory Rate Limiter using the Token Bucket or Sliding Window algorithm. How would you handle race conditions in a distributed cluster?",
      expectedAnswer: "Token bucket with refill rate and bucket capacity. In distributed systems, use Redis with Lua scripts or Redis cell to guarantee atomicity.",
      difficulty: "hard",
    },
    {
      questionType: "system_design",
      topic: "Microservices & Message Queues",
      question: "How would you design an event-driven payment processing pipeline that guarantees idempotency and at-least-once delivery?",
      expectedAnswer: "Use unique idempotency keys, transactional outbox pattern, message broker like Kafka/RabbitMQ with dead letter queues and acknowledgment hooks.",
      difficulty: "hard",
    },
    {
      questionType: "behavioral",
      topic: "System Outage",
      question: "Describe an incident where a production service went down. How did you diagnose the issue under pressure and what was your post-mortem process?",
      expectedAnswer: "STAR method: Log correlation, rollback or mitigation first, root cause analysis, blameless post-mortem, and automated alerting improvements.",
      difficulty: "medium",
    },
    {
      questionType: "hr",
      topic: "Work Culture",
      question: "How do you balance shipping features quickly versus paying down technical debt and writing comprehensive test suites?",
      expectedAnswer: "Pragmatic approach: 80/20 rule, test pyramid for critical paths, allocate 20% sprint bandwidth to refactoring and stability.",
      difficulty: "easy",
    },
  ],
  general: [
    {
      questionType: "theory",
      topic: "System Scalability",
      question: "What are the key trade-offs between horizontal scaling and vertical scaling, and how does CAP theorem dictate database choices?",
      expectedAnswer: "Horizontal adds nodes (complex networking/state), vertical upgrades machine (single point of failure limit). CAP theorem: Consistency, Availability, Partition tolerance trade-offs.",
      difficulty: "medium",
    },
    {
      questionType: "code",
      topic: "Data Structures",
      question: "Write an algorithm to find the longest substring without repeating characters in O(n) time complexity.",
      expectedAnswer: "Sliding window technique using a hash map or set to track character indices and shrink window when duplicates occur.",
      difficulty: "medium",
    },
    {
      questionType: "system_design",
      topic: "Scalable Architecture",
      question: "How would you design a scalable URL shortener like bit.ly handling 100 million writes per month and 1 billion reads?",
      expectedAnswer: "Base62 encoding of auto-incrementing ID or hash, Redis caching layer with LRU eviction, distributed database with read replicas and CDN.",
      difficulty: "hard",
    },
    {
      questionType: "behavioral",
      topic: "Deadlines & Prioritization",
      question: "Give an example of a project where requirements shifted mid-way through development. How did you re-prioritize deliverables?",
      expectedAnswer: "Transparent stakeholder communication, MVP scoping, agile backlog grooming, and incremental milestone delivery.",
      difficulty: "easy",
    },
    {
      questionType: "hr",
      topic: "Career Aspirations",
      question: "Where do you see yourself making the most impact over the next 2-3 years, and what environment brings out your best work?",
      expectedAnswer: "Ownership of technical roadmap, mentoring peers, collaborative cross-functional team with autonomy and clear goals.",
      difficulty: "easy",
    },
  ],
};

function getTemplateCategory(role = "") {
  const r = role.toLowerCase();
  if (r.includes("front") || r.includes("react") || r.includes("ui") || r.includes("web")) return "frontend";
  if (r.includes("back") || r.includes("node") || r.includes("api") || r.includes("python") || r.includes("java")) return "backend";
  return "general";
}

const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://127.0.0.1:5001";

async function generateQuestionsFallback({ role, count = 5, techStack = [], difficulty = "medium", experienceLevel = "mid" }) {
  // 1. Try Qwen 2.5 0.5B Local Microservice
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, count, techStack, difficulty, experienceLevel }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions;
      }
    }
  } catch (err) {
    // Local server offline or busy, fallback to curated bank
  }

  // 2. Static Bank Fallback
  const cat = getTemplateCategory(role);
  const bank = [...(ROLE_TEMPLATES[cat] || []), ...ROLE_TEMPLATES.general];
  const techNames = Array.isArray(techStack) && techStack.length ? techStack.join(", ") : role;

  const result = [];
  for (let i = 0; i < count; i++) {
    const template = bank[i % bank.length];
    const isTechSpecific = i === 0 && techStack.length > 0;

    result.push({
      questionId: `q${i + 1}`,
      question: isTechSpecific
        ? `Regarding your experience with ${techStack[0]}: ${template.question}`
        : template.question,
      questionType: template.questionType,
      difficulty: template.difficulty,
      expectedAnswer: template.expectedAnswer,
      topic: template.topic,
    });
  }

  return result;
}

async function evaluateAnswerFallback({ question, expectedAnswer = "", topic = "", userAnswer = "", code = "", role = "Software Engineer", techStack = [] }) {
  // 1. Try Local Qwen 2.5 0.5B Engine (sub-second CPU inference)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, expectedAnswer, topic, userAnswer, code, role, techStack }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.score) {
        console.log(`🤖 Answer evaluated with Local Qwen 2.5 0.5B (${data.latency_ms}ms)`);
        return {
          score: data.score,
          shortFeedback: data.shortFeedback,
          brutalFeedback: data.brutalFeedback,
          crossQuestion: data.crossQuestion,
          strength: code ? "Clear implementation logic and structured code approach" : (data.shortFeedback || "Clear articulation of relevant technical details"),
          weakness: data.brutalFeedback,
          idealAnswer: expectedAnswer || "A comprehensive answer covers operational scaling, race conditions, and production observability.",
        };
      }
    }
  } catch (err) {
    // Local server offline or timed out, fallback gracefully below
  }

  // 2. Deterministic Fallback if local model is offline
  const combined = (userAnswer + " " + (code || "")).trim();
  const wordCount = combined.split(/\s+/).filter(Boolean).length;

  let score = 7;
  if (wordCount < 10 && !code) score = 4;
  else if (wordCount < 25 && !code) score = 5.5;
  else if (wordCount > 60 || (code && code.length > 50)) score = 8.5;
  else score = 7.5;

  if (code && code.trim().length > 20) {
    score = Math.min(9.5, score + 1);
  }

  const topicName = topic || (question ? question.slice(0, 45).trim() + "..." : "this topic");
  const shortFeedback = code
    ? `Code structure is cleanly outlined for ${topicName} and targets the core functional requirements.`
    : (wordCount > 25
      ? `Solid and clear answer addressing key concepts and practical tradeoffs in ${topicName}.`
      : `Good starting point on ${topicName}, but could benefit from deeper technical detail and concrete examples.`);

  const brutalFeedback = code
    ? `Consider testing edge cases such as empty inputs, boundary values, and optimal space complexity for ${topicName}.`
    : (wordCount < 30
      ? `Lacked depth on edge cases, scaling limitations, and architectural rationale for ${topicName}.`
      : `Could be more structured using quantifiable metrics and trade-offs for ${topicName}.`);

  return {
    score: Math.round(score * 10) / 10,
    shortFeedback,
    brutalFeedback,
    strength: code ? `Strong code implementation and logical structure for ${topicName}` : `Clear communication and relevant grasp of ${topicName}`,
    weakness: `Could delve deeper into production failure modes and trade-offs for ${topicName}`,
    idealAnswer: expectedAnswer || "A comprehensive answer covers the underlying mechanism, operational complexity, edge cases, and architectural best practices.",
  };
}

async function generateFollowupFallback({
  question,
  userAnswer = "",
  code = "",
  role = "Software Engineer",
  techStack = [],
  pacing = null,
}) {
  const isShort = pacing?.targetFollowupSize === "short" || pacing?.urgency === "tight" || pacing?.urgency === "critical";
  const maxWords = pacing?.maxFollowupWords || (isShort ? 14 : 25);

  // 1. Try Local Qwen 2.5 0.5B Engine for sharp cross-questioning
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/cross-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        userAnswer,
        code,
        role,
        techStack,
        urgency: pacing?.urgency || "normal",
        targetSize: pacing?.targetFollowupSize || "standard",
        maxWords,
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      const q = data.followupQuestion || data.crossQuestion;
      if (data.success && q) {
        console.log(`🤖 Cross-question generated with Local Qwen 2.5 0.5B (${data.latency_ms}ms, brevity: ${isShort ? 'short' : 'standard'})`);
        return q;
      }
    }
  } catch (err) {}

  // 2. Deterministic Fallback based on pacing and code context
  if (isShort) {
    if (code && code.trim().length > 10) {
      const shortCodeFollowups = [
        "In one sentence, what is the Big-O time complexity of your solution?",
        "Quickly, how does your implementation handle an empty or null input?",
        "What is the single biggest bottleneck if traffic scales 10x?",
      ];
      return shortCodeFollowups[Math.floor(Math.random() * shortCodeFollowups.length)];
    }
    const shortFollowups = [
      "In one sentence, what is the primary architectural trade-off here?",
      "Quick question: how would you handle a race condition in this scenario?",
      "What key metric would you monitor in production for this?",
      "What is the biggest failure mode you would protect against?",
    ];
    return shortFollowups[Math.floor(Math.random() * shortFollowups.length)];
  }

  if (code && code.trim().length > 10) {
    const codeFollowups = [
      "What is the Big-O time and space complexity of your code implementation, and could it be improved?",
      "How does your code handle boundary edge cases, such as an empty input or extremely large datasets?",
      "If this function were called concurrently by 10,000 users per second, where would the bottleneck be?",
    ];
    return codeFollowups[Math.floor(Math.random() * codeFollowups.length)];
  }

  const followups = [
    "How would you monitor and measure this in production to catch performance bottlenecks early?",
    "What edge cases or failure modes would you watch out for if user traffic suddenly spiked 10x?",
    "Could you walk me through the trade-offs between that solution and a simpler alternative?",
    "How would you approach automated testing and continuous validation for this implementation?",
  ];
  const idx = Math.abs((userAnswer || "").length) % followups.length;
  return followups[idx];
}

async function generateHintFallback({ question, code = "", role = "Software Engineer" }) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, code, role }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.hint) {
        console.log(`💡 Hint generated with Local Qwen 2.5 0.5B (${data.latency_ms}ms)`);
        return data.hint;
      }
    }
  } catch (e) {}

  return "Think about the simplest base case first, or consider what data structure (like a hash map or two-pointer approach) gives you optimal lookup time.";
}

async function clarifyQuestionFallback({ question, query = "", role = "Software Engineer" }) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/clarify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, query, role }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.clarification) {
        console.log(`🔍 Clarification generated with Local Qwen 2.5 0.5B (${data.latency_ms}ms)`);
        return data.clarification;
      }
    }
  } catch (e) {}

  return "You may assume standard input types with valid data, and focus on optimal algorithmic time and space complexity.";
}

function classifyCandidateIntent(userAnswer = "") {
  const text = (userAnswer || "").trim().toLowerCase();
  if (!text) return { intent: "answer" };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // 1. Repeat intent
  if (/(can you |could you |please )?(repeat|say (that|it) again|pardon|what (is|was) the question|read (the question|it) again|didn't (hear|catch)|come again)/i.test(text) && wordCount < 15) {
    return { intent: "repeat" };
  }

  // 2. Hint intent
  if (/(give me (a |some )?hint|any hint|can i have a hint|need a hint|give (me )?a clue|i'm stuck.*hint|stuck on this.*hint|can you help.*start)/i.test(text) && wordCount < 18) {
    return { intent: "hint" };
  }

  // 3. Clarification intent
  if (/(can you clarify|what do you mean by|are we allowed to|can i use|should (it|i) return|is the input|does it have duplicates)/i.test(text) && wordCount < 25) {
    return { intent: "clarify", query: text };
  }

  // 4. Wait / thinking intent
  if (/^(give me a |wait a |just a |need a |one )?(sec|second|min|minute|moment)|(let me |just )?think|thinking through|hold on|bear with me/i.test(text) && wordCount < 16) {
    return { intent: "wait" };
  }

  // 5. Skip intent
  if (/\bskip\b/i.test(text) && wordCount < 12) {
    if (/(can (i|we)|could we|i want to|let's|please|skip this|skip to the next|skip question|want to skip)/i.test(text) || text === "skip") {
      return { intent: "skip" };
    }
  }
  if ((/^(i don't know|no idea|pass on this|move on to next|next question please)/i.test(text) && wordCount < 10)) {
    return { intent: "skip" };
  }

  return { intent: "answer" };
}

async function generateFinalReportFallback({ role, techStack = [], questionsData = [] }) {
  // 1. Try Local Qwen 2.5 0.5B Microservice
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(`${LOCAL_AI_URL}/interview/generate-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, techStack, questionsData }),
      signal: controller.signal
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.success && data.report) {
        const r = data.report;
        const recStr = (r.hiringRecommendation || r.recommendation || "").toLowerCase();
        let recommendation = "hire";
        if (recStr.includes("strong hire") || recStr.includes("strong_hire")) recommendation = "strong_hire";
        else if (recStr.includes("no hire") || recStr.includes("no_hire") || recStr.includes("strong no")) recommendation = "no_hire";
        else if (recStr.includes("leaning") || recStr.includes("borderline")) recommendation = "borderline";
        else if ((r.overallScore || 0) >= 8) recommendation = "strong_hire";
        else if ((r.overallScore || 0) < 6) recommendation = "borderline";

        return {
          overallScore: r.overallScore || 7.5,
          communicationScore: r.communicationScore || 7.5,
          technicalScore: r.technicalScore || 7.5,
          problemSolvingScore: r.problemSolvingScore || 7.5,
          hrScore: r.hrScore || Math.min(10, Math.round(((r.communicationScore || 7.5) + 0.3) * 10) / 10),
          codeQualityScore: r.codeQualityScore || (questionsData.some((q) => q.questionType === "code") ? 7.5 : null),
          strengths: r.strengths && r.strengths.length ? r.strengths : ["Consistent problem-solving structure", "Clear articulation of technical concepts"],
          weaknesses: r.weaknesses && r.weaknesses.length ? r.weaknesses : ["Can elaborate more proactively on distributed scale implications", "Deepen coverage of testing and observability edge cases"],
          overallFeedback: r.overallFeedback || r.detailedFeedback || `Candidate demonstrated solid foundational competency in ${role} with practical familiarity across ${techStack.join(", ") || "core domain concepts"}.`,
          recommendation,
          improvementAreas: r.improvementAreas || r.recommendations || [
            "Practice STAR-method framing for behavioral leadership answers",
            "Explore distributed transaction patterns and asynchronous messaging"
          ],
          topicsToStudy: r.topicsToStudy || [
            "Core Web Vitals & Runtime Performance",
            "Distributed Caching & Concurrency Control",
            "Event-Driven Architecture",
            "Observability & Production Resiliency"
          ],
        };
      }
    }
  } catch (err) {
    // Local server offline or busy, use static computation
  }

  // 2. Static Math Fallback
  const scores = questionsData.map((q) => q.score || 7.5);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 8;
  const rounded = Math.round(avg * 10) / 10;

  return {
    overallScore: rounded,
    communicationScore: Math.min(10, Math.round((rounded + 0.3) * 10) / 10),
    technicalScore: rounded,
    problemSolvingScore: Math.max(6, Math.round((rounded - 0.2) * 10) / 10),
    hrScore: 8.5,
    codeQualityScore: questionsData.some((q) => q.questionType === "code") ? 8.0 : null,
    overallFeedback: `Candidate demonstrated strong foundational competency in ${role} with practical familiarity across ${techStack.join(", ") || "core domain concepts"}. Responses showed good structured thinking with clear potential for senior engineering workflows.`,
    strengths: [
      "Consistent problem-solving structure",
      "Clear articulation of technical concepts",
      "Pragmatic approach to trade-offs",
    ],
    weaknesses: [
      "Can elaborate more proactively on distributed scale implications",
      "Deepen coverage of testing and observability edge cases",
    ],
    recommendation: rounded >= 7.5 ? "hire" : "borderline",
    improvementAreas: [
      "Practice STAR-method framing for behavioral leadership answers",
      "Explore distributed transaction patterns and asynchronous messaging",
    ],
    topicsToStudy: [
      "Core Web Vitals & Runtime Performance",
      "Distributed Caching & Concurrency Control",
      "Event-Driven Architecture",
      "Observability & Production Resiliency",
    ],
  };
}

module.exports = {
  generateQuestionsFallback,
  evaluateAnswerFallback,
  generateFollowupFallback,
  generateHintFallback,
  clarifyQuestionFallback,
  classifyCandidateIntent,
  generateFinalReportFallback,
};
