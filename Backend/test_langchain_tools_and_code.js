const {
  handleCandidateInteraction,
  evaluateAnswerWithLangChain,
  generateFollowupWithLangChain,
  repeatQuestionTool,
  provideHintTool,
  clarifyQuestionTool,
} = require("./src/services/langchainService");
const { classifyCandidateIntent } = require("./src/services/localAIService");
const WebSocket = require("ws");
const http = require("http");

async function runTests() {
  console.log("===============================================================");
  console.log("🧪 TESTING LANGCHAIN CONVERSATIONAL TOOLS & CODE-AWARE AI");
  console.log("===============================================================\n");

  const mockQuestion = {
    questionId: "q_code_1",
    question: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. What is the time and space complexity?",
    questionType: "code",
    expectedAnswer: "O(n) time using a hash map storing complement values, and O(n) space.",
  };

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Intent Classification
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 1: Candidate Intent Classification ---");
  const testUtterances = [
    { text: "Can you please repeat the question?", expected: "repeat" },
    { text: "Could you repeat that?", expected: "repeat" },
    { text: "Can you give me a hint on how to start?", expected: "hint" },
    { text: "I'm a bit stuck, any hint?", expected: "hint" },
    { text: "Can you clarify if the array is sorted or can contain negative numbers?", expected: "clarify" },
    { text: "Give me a second to think about this.", expected: "wait" },
    { text: "Can we skip to the next question?", expected: "skip" },
    { text: "My approach is to use a hash map to store seen elements with their indices.", expected: "answer" },
  ];

  for (const item of testUtterances) {
    const { intent } = classifyCandidateIntent(item.text);
    const pass = intent === item.expected;
    console.log(`[${pass ? "PASS" : "FAIL"}] Utterance: "${item.text}" -> Intent: ${intent} (expected: ${item.expected})`);
    if (!pass) throw new Error(`Intent classification failed for: ${item.text}`);
  }
  console.log("✅ All intent classifications passed!\n");

  // ─────────────────────────────────────────────────────────────
  // TEST 2: LangChain Tool Routing (handleCandidateInteraction)
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 2: LangChain Tool Routing ---");

  // A. Repeat
  const repeatInteraction = await handleCandidateInteraction({
    userAnswer: "Could you please repeat the question?",
    currentQuestion: mockQuestion,
    role: "Full Stack Developer",
  });
  console.log("Repeat interaction result:", repeatInteraction);
  if (repeatInteraction.action !== "repeat") throw new Error("Expected action: repeat");
  console.log("✅ Repeat question tool handled correctly.\n");

  // B. Hint
  const hintInteraction = await handleCandidateInteraction({
    userAnswer: "Can you give me a hint?",
    code: "function twoSum(nums, target) {\n  for(let i=0; i<nums.length; i++) {\n    // stuck here\n  }\n}",
    currentQuestion: mockQuestion,
    role: "Full Stack Developer",
  });
  console.log("Hint interaction result:", hintInteraction);
  if (hintInteraction.action !== "hint" || !hintInteraction.message) throw new Error("Expected action: hint with message");
  console.log("✅ Provide hint tool handled correctly.\n");

  // C. Clarify
  const clarifyInteraction = await handleCandidateInteraction({
    userAnswer: "Can you clarify if the array can contain negative integers?",
    currentQuestion: mockQuestion,
    role: "Full Stack Developer",
  });
  console.log("Clarification interaction result:", clarifyInteraction);
  if (clarifyInteraction.action !== "clarify" || !clarifyInteraction.message) throw new Error("Expected action: clarify with message");
  console.log("✅ Clarify question tool handled correctly.\n");

  // D. Wait / Thinking
  const waitInteraction = await handleCandidateInteraction({
    userAnswer: "Just a moment please, thinking through the edge cases",
    currentQuestion: mockQuestion,
    role: "Full Stack Developer",
  });
  console.log("Wait interaction result:", waitInteraction);
  if (waitInteraction.action !== "wait") throw new Error("Expected action: wait");
  console.log("✅ Wait reassurance handled correctly.\n");

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Dual Code + Verbal Evaluation (Local Qwen 2.5 0.5B / LangChain)
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 3: Code Context Evaluation ---");
  const candidateCode = `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`;
  const candidateVerbal = "I implemented a one-pass hash map solution. In each iteration, I compute the complement and check if it exists in the map. This achieves O(n) time complexity and O(n) space complexity, which is optimal.";

  console.log("Submitting candidate code and verbal explanation for evaluation...");
  const evaluation = await evaluateAnswerWithLangChain({
    question: mockQuestion.question,
    questionType: "code",
    expectedAnswer: mockQuestion.expectedAnswer,
    userAnswer: candidateVerbal,
    code: candidateCode,
    role: "Full Stack Developer",
    techStack: ["JavaScript", "Node.js", "React"],
  });

  console.log("Evaluation Result:", JSON.stringify(evaluation, null, 2));
  if (typeof evaluation.score !== "number" || evaluation.score < 6) {
    throw new Error(`Expected passing score for optimal solution, got: ${evaluation.score}`);
  }
  console.log(`✅ Code evaluation successful! Score: ${evaluation.score}/10\n`);

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Code-Aware Cross-Question / Follow-up Generation
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 4: Code-Aware Cross-Question Follow-up ---");
  const followup = await generateFollowupWithLangChain({
    question: mockQuestion.question,
    userAnswer: candidateVerbal,
    code: candidateCode,
    role: "Full Stack Developer",
    techStack: ["JavaScript", "Node.js"],
  });

  console.log("Follow-up Generated:", JSON.stringify(followup, null, 2));
  const followupText = typeof followup === "string" ? followup : followup?.followupQuestion;
  if (!followupText) throw new Error("Failed to generate follow-up question");
  console.log(`✅ Code-aware follow-up question successfully generated:\n   "${followupText}"\n`);

  // ─────────────────────────────────────────────────────────────
  // TEST 5: WebSocket End-to-End Test
  // ─────────────────────────────────────────────────────────────
  console.log("--- TEST 5: WebSocket End-to-End Socket Integration ---");

  // Create an interview first via HTTP
  const createData = JSON.stringify({
    role: "Full Stack Developer",
    experienceLevel: "mid",
    techStack: ["React", "Node.js", "JavaScript"],
    difficulty: "medium",
    interviewType: "technical",
    questionCount: 4,
    aiEngine: "local",
    codingQCount: 1,
  });

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: "660000000000000000000001", email: "demo@example.com" },
    process.env.JWT_SECRET || "super_secret_dev_key_intervusetu_2026",
    { expiresIn: "1h" }
  );

  const interviewId = await new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: 5000,
        path: "/api/interviews/create",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "Content-Length": Buffer.byteLength(createData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body);
            const id = parsed.data?.interviewId || parsed.interviewId || parsed.interview?._id;
            if (!id) {
              return reject(new Error("No interviewId in response: " + body));
            }
            resolve(id.toString());
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(createData);
    req.end();
  });

  console.log(`Created interview session for socket test: ${interviewId}`);

  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:5000/ws/interview?token=${token}&interviewId=${interviewId}`);

    ws.on("open", () => {
      console.log("WebSocket connected. Starting interview...");
      ws.send(JSON.stringify({
        type: "START_INTERVIEW",
        payload: { interviewId, candidateName: "Third Year Developer" }
      }));
    });

    let step = 0;

    ws.on("message", (msg) => {
      const data = JSON.parse(msg.toString());
      console.log(`[WS RCV] Type: ${data.type}`);

      if (data.type === "INTERVIEW_STARTED") {
        step = 1;
        console.log("Interview started. Testing verbal conversational request: 'can you repeat the question?'");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: { userAnswer: "Could you please repeat that question for me?", code: null }
        }));
      } else if (data.type === "QUESTION_REPEATED") {
        console.log(`✅ Received QUESTION_REPEATED! Message: "${data.payload.question}"`);
        step = 2;
        console.log("Testing explicit REQUEST_HINT socket event...");
        ws.send(JSON.stringify({
          type: "REQUEST_HINT",
          payload: { code: "" }
        }));
      } else if (data.type === "AI_HINT") {
        console.log(`✅ Received AI_HINT! Hint: "${data.payload.hint}"`);
        step = 3;
        console.log("Testing coding answer submission with code block...");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "I solved this using a hash map for complement lookup in O(n) time.",
            code: candidateCode,
          }
        }));
      } else if (data.type === "PROCESSING") {
        console.log("Received PROCESSING signal. Waiting for AI evaluation...");
      } else if (data.type === "FOLLOWUP_QUESTION" || data.type === "NEXT_QUESTION") {
        console.log(`✅ Evaluation successful! Action received: ${data.type}`);
        if (data.payload?.evaluation) {
          console.log(`   Score: ${data.payload.evaluation.score}/10`);
        }
        ws.close();
        resolve();
      }
    });

    ws.on("error", (err) => {
      console.error("WS error:", err);
      reject(err);
    });

    setTimeout(() => {
      reject(new Error("WebSocket test timed out"));
    }, 30000);
  });

  console.log("\n===============================================================");
  console.log("🎉 ALL TESTS PASSED! LANGCHAIN TOOLS & CODE EVAL FULLY WORKING");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
