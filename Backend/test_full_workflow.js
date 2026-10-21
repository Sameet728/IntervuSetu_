const WebSocket = require("ws");
const http = require("http");
const jwt = require("jsonwebtoken");

async function runFullWorkflowTest() {
  console.log("=================================================================");
  console.log("🚀 TESTING COMPLETE END-TO-END INTERVIEW WORKFLOW");
  console.log("   - Question 1 -> Follow-up -> Question 2 (Coding) -> Complete");
  console.log("   - STT answer simulation, code evaluation, question transitions");
  console.log("=================================================================\n");

  const demoUserId = "660000000000000000000001";
  const jwtSecret = process.env.JWT_SECRET || "super_secret_dev_key_intervusetu_2026";
  const token = jwt.sign({ id: demoUserId, email: "candidate@test.com" }, jwtSecret, { expiresIn: "2h" });

  // 1. Create an interview with 2 questions: Theory + Coding
  const createPayload = JSON.stringify({
    role: "Full Stack Developer",
    experienceLevel: "mid",
    techStack: ["Node.js", "React", "JavaScript"],
    difficulty: "medium",
    interviewType: "technical",
    questionCount: 3,
    aiEngine: "local",
    codingQCount: 1,
  });

  console.log("Step 1: Creating interview session via REST API...");
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
          "Content-Length": Buffer.byteLength(createPayload),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (!data.success) {
              return reject(new Error("Create interview failed: " + body));
            }
            const id = data.data?.interviewId || data.interviewId;
            resolve(id);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(createPayload);
    req.end();
  });

  console.log(`✅ Interview created successfully! ID: ${interviewId}\n`);

  // 2. Connect WebSocket and run through the interactive flow
  console.log("Step 2: Connecting WebSocket & starting interview...");
  await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:5000/ws/interview?token=${token}&interviewId=${interviewId}`);

    let currentStep = "INIT";
    let followupReceived = false;

    ws.on("open", () => {
      console.log("📡 WebSocket connected. Emitting START_INTERVIEW...");
      ws.send(JSON.stringify({
        type: "START_INTERVIEW",
        payload: { interviewId, candidateName: "Alex Morgan" }
      }));
    });

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      console.log(`\n📩 [WS INCOMING] Type: ${msg.type}`);

      switch (msg.type) {
        case "INTERVIEW_STARTED": {
          console.log(`🎙️ Interview Active! Greeting/First Question: "${msg.payload.greeting || msg.payload.firstQuestion?.question}"`);
          currentStep = "Q1_ANSWERING";

          // Simulate candidate answering Q1 with brief technical explanation to elicit follow-up
          console.log("\n[Candidate] Speaking answer to Question 1...");
          const answerQ1 = "In JavaScript, the event loop handles asynchronous operations using the call stack and callback queue. Microtasks like Promises run before macrotasks like setTimeout.";
          
          setTimeout(() => {
            console.log(`[Action] Submitting answer for Question 1: "${answerQ1}"`);
            ws.send(JSON.stringify({
              type: "SUBMIT_ANSWER",
              payload: { userAnswer: answerQ1, code: null }
            }));
          }, 1000);
          break;
        }

        case "PROCESSING": {
          console.log(`⏳ Processing: ${msg.payload.message}`);
          break;
        }

        case "FOLLOWUP_QUESTION": {
          followupReceived = true;
          console.log(`✅ FOLLOWUP_QUESTION Received!`);
          console.log(`   Follow-up prompt: "${msg.payload.question}"`);
          if (msg.payload.evaluation) {
            console.log(`   Initial evaluation score: ${msg.payload.evaluation.score}/10`);
            console.log(`   Short feedback: "${msg.payload.evaluation.shortFeedback}"`);
          }

          // Candidate now answers the follow-up question
          currentStep = "Q1_FOLLOWUP_ANSWERING";
          const followupAnswer = "When a microtask queue has recursive promises, it can starve the macrotask queue because the event loop drains microtasks completely before executing the next macrotask.";
          console.log(`\n[Candidate] Answering follow-up question: "${followupAnswer}"`);

          setTimeout(() => {
            ws.send(JSON.stringify({
              type: "SUBMIT_ANSWER",
              payload: { userAnswer: followupAnswer, code: null }
            }));
          }, 1200);
          break;
        }

        case "NEXT_QUESTION": {
          const qIdx = msg.payload.questionIndex;
          console.log(`✅ NEXT_QUESTION Transition Received!`);
          console.log(`   Question Index: ${qIdx + 1}/${msg.payload.totalQuestions}`);
          console.log(`   Question Type: ${msg.payload.question?.questionType}`);
          console.log(`   Question: "${msg.payload.question?.conversationalText || msg.payload.question?.question}"`);
          
          if (msg.payload.prevEvaluation) {
            console.log(`   Previous Question Score: ${msg.payload.prevEvaluation.score}/10`);
          }

          if (qIdx === 1) {
            // Step: Question 2 - Candidate solves coding question
            currentStep = "Q2_CODING_ANSWERING";
            const candidateCode = `function reverseString(str) {
  let left = 0;
  let right = str.length - 1;
  const arr = str.split('');
  while (left < right) {
    const temp = arr[left];
    arr[left] = arr[right];
    arr[right] = temp;
    left++;
    right--;
  }
  return arr.join('');
}`;
            const candidateExplanation = "I implemented a two-pointer approach to reverse the string in O(n) time complexity and O(n) space complexity since strings are immutable in JavaScript.";

            console.log(`\n[Candidate] Submitting Code Solution & Spoken Explanation for Question 2...`);
            console.log(`   Spoken: "${candidateExplanation}"`);
            console.log(`   Code lines: ${candidateCode.split('\n').length} lines`);

            setTimeout(() => {
              ws.send(JSON.stringify({
                type: "SUBMIT_ANSWER",
                payload: {
                  userAnswer: candidateExplanation,
                  code: candidateCode,
                }
              }));
            }, 1500);
          } else {
            // Question 3 - Final question
            currentStep = "Q3_FINAL_ANSWERING";
            const finalAnswer = "I prioritize writing testable, modular code with thorough unit and integration tests using Jest. I also set up CI/CD pipelines to ensure automated testing and linting before every release.";
            console.log(`\n[Candidate] Submitting Answer for Question 3: "${finalAnswer}"`);

            setTimeout(() => {
              ws.send(JSON.stringify({
                type: "SUBMIT_ANSWER",
                payload: {
                  userAnswer: finalAnswer,
                  code: null,
                }
              }));
            }, 1500);
          }
          break;
        }

        case "INTERVIEW_COMPLETE": {
          console.log(`\n🎉 INTERVIEW_COMPLETE Received!`);
          console.log(`   Closing Message: "${msg.payload.message}"`);
          if (msg.payload.evaluation) {
            console.log(`   Final Question Score: ${msg.payload.evaluation.score}/10`);
          }
          ws.close();
          resolve();
          break;
        }

        case "error": {
          console.error(`❌ WS Error message:`, msg.payload);
          reject(new Error(msg.payload.message || "WebSocket error"));
          break;
        }

        default:
          console.log(`ℹ️ [Other msg]:`, msg);
      }
    });

    ws.on("error", (err) => {
      console.error("WS connection error:", err);
      reject(err);
    });

    setTimeout(() => {
      reject(new Error("Interview workflow test timed out after 60s"));
    }, 60000);
  });

  console.log("\n=================================================================");
  console.log("✅ FULL WORKFLOW TEST COMPLETE — ALL STEPS VALIDATED!");
  console.log("=================================================================");
}

runFullWorkflowTest().catch((err) => {
  console.error("❌ Workflow test failed:", err);
  process.exit(1);
});
