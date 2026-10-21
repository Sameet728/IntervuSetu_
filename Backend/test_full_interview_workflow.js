const WebSocket = require("ws");

async function runComprehensiveWorkflowTest() {
  console.log("==========================================================");
  console.log("🚀 STARTING COMPREHENSIVE INTERVIEW WORKFLOW TEST");
  console.log("==========================================================");

  // 1. Create Prebuilt Interview (Frontend React)
  const startResp = await fetch("http://localhost:5000/api/interviews/prebuilt/frontend-react/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const startData = await startResp.json();
  console.log("1. Interview Initialized:", startData.data);
  const interviewId = startData.data.interviewId;

  // 2. Connect WebSocket
  const ws = new WebSocket(`ws://localhost:5000/ws/interview?interviewId=${interviewId}`);

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });
  console.log("2. WebSocket Connected to Session");

  return new Promise((resolve, reject) => {
    let currentQ = null;
    let isIntroAnswered = false;
    let hintTested = false;

    ws.on("message", async (raw) => {
      const data = JSON.parse(raw.toString());
      console.log(`\n📩 [EVENT: ${data.type}]`);

      // Session Connected
      if (data.type === "connected") {
        console.log("👉 Action: Sending START_INTERVIEW");
        ws.send(JSON.stringify({
          type: "START_INTERVIEW",
          payload: { candidateName: "Alex Morgan" }
        }));
      }

      // Interview Started (Question 0 - Intro)
      if (data.type === "INTERVIEW_STARTED") {
        currentQ = data.payload.firstQuestion;
        console.log(`✅ Question 0 Received: [${currentQ.questionId}] ${currentQ.topic} (Type: ${currentQ.questionType})`);
        console.log(`🗣️ Spoken Greeting: "${data.payload.greeting}"`);

        if (currentQ.questionId !== "q_intro" || currentQ.topic !== "Self Introduction") {
          return reject(new Error("FAILED: Question 0 must be q_intro (Self Introduction)"));
        }

        console.log("\n👉 Action: Submitting Self-Introduction Answer");
        isIntroAnswered = true;
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "Hi, I am Alex. I've been building scalable frontend web applications for 4 years using React, Next.js, and TypeScript. In my last role, I led the migration of a legacy app to React 18, improving Core Web Vitals significantly. Excited to discuss the role!",
            code: null,
          }
        }));
      }

      // AI Hint Response
      if (data.type === "AI_HINT") {
        console.log(`💡 Received AI Hint: "${data.payload.hint}"`);
        console.log("👉 Action: Now submitting full answer after hint...");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "I balanced technical excellence with tight delivery schedules by setting clear MVP milestones with designers and using feature flags for gradual animation rollout.",
            code: null,
          }
        }));
      }

      // Follow-up Question
      if (data.type === "FOLLOWUP_QUESTION") {
        console.log(`🔁 Received AI Follow-up: "${data.payload.question}"`);
        console.log(`📊 Current Score: ${data.payload.evaluation?.score}/10`);
        console.log("👉 Answering follow-up question...");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "We maintained team consensus through weekly design-dev syncs and monitored performance metrics directly in our staging environment.",
            code: currentQ?.questionType === "code" ? "function useLocalStorage() { /* updated */ }" : null,
          }
        }));
      }

      // Next Question
      if (data.type === "NEXT_QUESTION") {
        currentQ = data.payload.question;
        console.log(`\n➡️ Advanced to Question: [${currentQ.questionId}] (Index: ${data.payload.questionIndex} of ${data.payload.totalQuestions})`);
        console.log(`📌 Topic: ${currentQ.topic} | Type: ${currentQ.questionType}`);
        console.log(`🌉 Conversational Bridge: "${currentQ.conversationalText || currentQ.question}"`);

        // Check if this is the Coding question
        if (currentQ.questionType === "code") {
          console.log("\n💻 [CODING QUESTION DETECTED] -> Triggering Code Editor Workflow!");
          const sampleCode = `function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });

  const setValue = (val) => {
    const valToStore = val instanceof Function ? val(storedValue) : val;
    setStoredValue(valToStore);
    window.localStorage.setItem(key, JSON.stringify(valToStore));
  };

  return [storedValue, setValue];
}`;
          console.log("👉 Submitting Code + Voice Notes...");
          ws.send(JSON.stringify({
            type: "SUBMIT_ANSWER",
            payload: {
              userAnswer: "Here is my custom hook implementation with lazy state initialization and JSON error handling.",
              code: sampleCode,
            }
          }));
          return;
        }

        // Test hint on the first regular question
        if (!hintTested) {
          hintTested = true;
          console.log("\n👉 Action: Testing conversational hint tool...");
          ws.send(JSON.stringify({
            type: "SUBMIT_ANSWER",
            payload: {
              userAnswer: "Can you give me a hint on this?",
              code: null,
            }
          }));
          return;
        }

        // Answer regular question
        console.log("\n👉 Action: Submitting standard comprehensive answer...");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "React reconciliation compares the new virtual DOM with the previous snapshot using a heuristic diffing algorithm. Fiber breaks rendering work into incremental units, allowing browser time-slicing and prioritized user interactions.",
            code: null,
          }
        }));
      }

      // Interview Complete
      if (data.type === "INTERVIEW_COMPLETE") {
        console.log("\n==========================================================");
        console.log("🎉 INTERVIEW COMPLETED SUCCESSFULLY!");
        console.log(`🗣️ Closing AI Message: "${data.payload.message}"`);
        console.log("==========================================================");
        ws.close();
        resolve();
      }
    });

    setTimeout(() => {
      reject(new Error("Workflow test timed out after 60 seconds"));
    }, 60000);
  });
}

runComprehensiveWorkflowTest()
  .then(() => {
    console.log("\n✅ ALL WORKFLOWS VALIDATED AND PASSED END-TO-END!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ Workflow test failed:", err);
    process.exit(1);
  });
