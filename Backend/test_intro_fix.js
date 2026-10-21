const WebSocket = require("ws");

async function runTest() {
  console.log("=== Testing Introduction & Follow-up Flow Fix ===");

  // 1. Start Prebuilt Interview
  const startResp = await fetch("http://localhost:5000/api/interviews/prebuilt/backend-node/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const startData = await startResp.json();
  console.log("1. Created Prebuilt Interview:", startData);

  const interviewId = startData.data.interviewId;
  if (!interviewId) throw new Error("No interviewId returned");

  // 2. Connect via WebSocket
  const ws = new WebSocket(`ws://localhost:5000/ws/interview?interviewId=${interviewId}`);

  await new Promise((resolve, reject) => {
    ws.on("open", resolve);
    ws.on("error", reject);
  });

  console.log("2. WebSocket Connected");

  return new Promise((resolve, reject) => {
    ws.on("message", (raw) => {
      const data = JSON.parse(raw.toString());
      console.log(`📩 Received WS event: [${data.type}]`, JSON.stringify(data.payload || {}, null, 2).slice(0, 300));

      if (data.type === "connected") {
        console.log("Sending START_INTERVIEW...");
        ws.send(JSON.stringify({
          type: "START_INTERVIEW",
          payload: { candidateName: "Smith Pizza" },
        }));
      }

      if (data.type === "INTERVIEW_STARTED") {
        console.log("\n--- VERIFYING INTERVIEW_STARTED ---");
        const firstQ = data.payload.firstQuestion;
        console.log("Question ID:", firstQ.questionId);
        console.log("Topic:", firstQ.topic);
        console.log("Question Type:", firstQ.questionType);
        console.log("Greeting / Question text:", data.payload.greeting || firstQ.question);

        if (firstQ.questionId !== "q_intro" || firstQ.topic !== "Self Introduction") {
          return reject(new Error(`FAIL: Expected q_intro, got ${firstQ.questionId}`));
        }
        console.log("✅ Verified: Question 0 is guaranteed to be q_intro (Self Introduction)");

        // Submit the user's self-introduction answer
        console.log("\n3. Submitting candidate self-introduction answer...");
        ws.send(JSON.stringify({
          type: "SUBMIT_ANSWER",
          payload: {
            userAnswer: "Good morning my name is Smith Pizza I am currently studying boutique data science degree in MIT overhandi I love building real life projects using full stack development I also know a bit about machine learning and about financial markets my recent project was with Maharashtra police studipar which was for external criminals to track them whether they are coming to the specified District I also build many other projects like intervis Day 2 on which I am currently giving the interview right now so it's also working too good yeah that's all",
            code: null,
          }
        }));
      }

      if (data.type === "FOLLOWUP_QUESTION") {
        console.error("❌ FAILED: Received FOLLOWUP_QUESTION for self-introduction!");
        console.error("Follow-up text:", data.payload.question);
        ws.close();
        return reject(new Error("Follow-up should NEVER be asked on self-introduction!"));
      }

      if (data.type === "NEXT_QUESTION") {
        console.log("\n--- VERIFYING NEXT_QUESTION ---");
        const nextQ = data.payload.question;
        console.log("Question Index:", data.payload.questionIndex);
        console.log("Next Question ID:", nextQ.questionId);
        console.log("Next Question Topic:", nextQ.topic);
        console.log("Conversational Text with Bridge:", nextQ.conversationalText);
        console.log("Evaluation of Intro:", data.payload.prevEvaluation);

        if (data.payload.questionIndex !== 1) {
          return reject(new Error(`Expected questionIndex 1, got ${data.payload.questionIndex}`));
        }
        console.log("\n🎉 SUCCESS: Successfully transitioned from self-intro to technical question with natural bridge without any follow-up cross-questions!");
        ws.close();
        resolve();
      }
    });
  });
}

runTest()
  .then(() => {
    console.log("\nAll tests passed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
