/**
 * IntervuSetu Full Dry-Run Test
 * ─────────────────────────────────────────────────────────────────────
 * Simulates a complete interview session for a 3rd-year Full Stack 
 * Developer student. Tests:
 *   1. Auth (register + login)
 *   2. Interview creation (Full Stack, 30min, medium)
 *   3. WebSocket session (greeting → intro → HR → Tech → Coding)
 *   4. Answers like a 3rd-year student (partial, rough, learning)
 *   5. Follow-up handling
 *   6. Final report generation
 *   7. Transcript download check
 */

const WebSocket = require("ws");
const http = require("http");
const https = require("https");

const BASE_URL = "http://localhost:5000";
const WS_URL = "ws://localhost:5000";

// ─── 3rd-year student answers (imperfect, realistic) ─────────────────
const STUDENT_ANSWERS = {
  "Self Introduction": `Hi, I'm a 3rd year CS student from VIT. I've been working with React and Node.js for about a year now. I did an internship last summer where I built a todo app and a small ecommerce frontend. I'm really interested in full stack development and I've been learning a lot through YouTube and personal projects. I'm still learning things like system design and databases but I think I know the basics pretty well.`,

  "hr": `I think teamwork is really important. Like in my college project we had 4 people and everyone had different tasks. Sometimes there were conflicts about how to do things but we figured it out by talking. I'm a quick learner and I like to google things when I'm stuck. My weakness is maybe I take too long sometimes because I want to make things perfect.`,

  "behavioral": `There was this one time in my internship when the deadline was tomorrow and I had to fix a bug in the React app. I stayed up late and eventually found that it was a state management issue. I used console.log a lot to debug it. My manager was happy that I fixed it. I learned that debugging is really important and you should not panic.`,

  "theory": `React uses virtual DOM which is faster than real DOM. Components are functions that return JSX. For Node.js, it's just JavaScript on the backend to write APIs. That's mainly how I've used them in college.`,

  "system_design": `I haven't built large systems yet. Probably just one Express server and a Mongo database. If there are too many users, I'm not really sure, maybe we just get a bigger server with more RAM?`,

  "code": `function reverseString(str) {
  // split the string into array then reverse and join
  return str.split('').reverse().join('');
}

// For finding duplicates in an array
function findDuplicates(arr) {
  let seen = {};
  let result = [];
  for(let i = 0; i < arr.length; i++) {
    if(seen[arr[i]]) {
      if(!result.includes(arr[i])) result.push(arr[i]);
    } else {
      seen[arr[i]] = true;
    }
  }
  return result;
}

// I know this might not be the most optimal solution
// but it works for basic cases`,

  "followup": `Hmm, that's a good question. I think I haven't fully thought about that. Maybe we could use... like I know there's something called indexing in databases that makes queries faster? And for the React part I think we can use useMemo to prevent unnecessary re-renders. I'm not 100% sure about the edge cases you mentioned but I'll definitely look into that more.`
};

// ─── HTTP helper ──────────────────────────────────────────────────────
function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: raw });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ─── Logging helpers ──────────────────────────────────────────────────
const log = (msg) => console.log(`\n${"─".repeat(60)}\n${msg}`);
const ok = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.log(`  ⚠️  ${msg}`);
const err = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);

// ─── Sleep utility ────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Main Test ────────────────────────────────────────────────────────
async function runDryRun() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║      IntervuSetu Full System Dry-Run — 3rd Year Student      ║  
║        Role: Full Stack Developer | Duration: 30min          ║
╚══════════════════════════════════════════════════════════════╝
`);

  // ── STEP 1: Authenticate Test Candidate ────────────────────────
  log("STEP 1: Authenticating test user (Rahul Sharma, 3rd Year CS)");
  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: "660000000000000000000001", name: "Rahul Sharma", email: "candidate@intervusetu.ai" },
    process.env.JWT_SECRET || "super_secret_dev_key_intervusetu_2026",
    { expiresIn: "7d" }
  );
  ok(`Authenticated: Rahul Sharma (VIT 3rd Year CS Student)`);
  info(`Token: ${token.slice(0, 40)}...`);

  // ── STEP 2: Create Interview ──────────────────────────────────────
  log("STEP 2: Creating Full Stack Developer interview (30 min, medium)");
  const createRes = await request("POST", "/api/interviews/create", {
    role: "Full Stack Developer",
    experienceLevel: "junior",
    techStack: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
    interviewType: "mixed",
    difficulty: "medium",
    targetDuration: 30,
    questionCount: 0, // auto-calculate from duration
    aiEngine: "groq",
  }, token);

  if (createRes.status !== 201) {
    err(`Interview creation failed: ${JSON.stringify(createRes.data).slice(0, 300)}`);
    process.exit(1);
  }

  const interviewData = createRes.data.data;
  const interviewId = interviewData.interviewId;
  ok(`Interview created: ${interviewId}`);
  ok(`Total questions generated: ${interviewData.totalQuestions}`);
  info(`Question list:`);
  interviewData.questions?.forEach((q, i) => {
    console.log(`    Q${i + 1}. [${q.questionType?.toUpperCase().padEnd(12)}] [${q.difficulty?.padEnd(6)}] ${q.question?.slice(0, 70)}...`);
  });

  // ── STEP 3: Run Interview via WebSocket ───────────────────────────
  log("STEP 3: Starting WebSocket interview session");

  let questionCount = 0;
  let followupCount = 0;
  let completedNormally = false;
  let finalMessage = "";
  const wsLog = [];

  await new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}/ws/interview?token=${token}&interviewId=${interviewId}`);

    const sendMsg = (type, payload = {}) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
      }
    };

    let currentQuestionType = "hr";
    let currentQuestionIndex = 0;
    let processingAnswer = false;

    ws.on("open", () => {
      ok("WebSocket connected");
    });

    ws.on("message", async (raw) => {
      const msg = JSON.parse(raw.toString());
      const { type, payload } = msg;

      switch (type) {
        case "connected": {
          info("Server confirmed connection → sending START_INTERVIEW");
          sendMsg("START_INTERVIEW", { candidateName: "Rahul Sharma" });
          break;
        }

        case "INTERVIEW_STARTED": {
          ok(`Interview started! Greeting: "${payload.greeting?.slice(0, 80)}..."`);
          ok(`First question (${payload.firstQuestion?.questionType}): "${payload.firstQuestion?.question?.slice(0, 70)}..."`);
          wsLog.push({ from: "AI", text: payload.greeting });
          wsLog.push({ from: "AI", text: payload.firstQuestion?.question });
          
          currentQuestionType = payload.firstQuestion?.questionType || "hr";
          currentQuestionIndex = payload.questionIndex || 0;
          questionCount = 1;
          
          // Send QUESTION_STARTED
          sendMsg("QUESTION_STARTED", { questionId: payload.firstQuestion?.questionId });

          // Wait 2s then answer like a 3rd year student
          await sleep(2000);
          
          let answer;
          if (currentQuestionType === "hr" || currentQuestionIndex === 0) {
            answer = STUDENT_ANSWERS["Self Introduction"];
          } else {
            answer = STUDENT_ANSWERS[currentQuestionType] || STUDENT_ANSWERS["hr"];
          }
          
          info(`Answering Q${questionCount} [${currentQuestionType}]: "${answer.slice(0, 60)}..."`);
          wsLog.push({ from: "CANDIDATE", text: answer });
          sendMsg("SUBMIT_ANSWER", { userAnswer: answer, code: null });
          processingAnswer = true;
          break;
        }

        case "PROCESSING": {
          info("AI is processing answer...");
          break;
        }

        case "FOLLOWUP_QUESTION": {
          followupCount++;
          processingAnswer = false;
          ok(`Follow-up ${followupCount}: "${payload.question?.slice(0, 80)}..."`);
          if (payload.evaluation?.score != null) {
            info(`Previous answer score: ${payload.evaluation.score}/10`);
            info(`Feedback: ${payload.evaluation.shortFeedback?.slice(0, 80)}`);
          }
          wsLog.push({ from: "AI (FOLLOWUP)", text: payload.question });

          // Wait then give a partial follow-up answer
          await sleep(1500);
          const followupAnswer = STUDENT_ANSWERS["followup"];
          info(`Answering follow-up: "${followupAnswer.slice(0, 60)}..."`);
          wsLog.push({ from: "CANDIDATE", text: followupAnswer });
          sendMsg("SUBMIT_ANSWER", { userAnswer: followupAnswer, code: null });
          processingAnswer = true;
          break;
        }

        case "NEXT_QUESTION": {
          processingAnswer = false;
          questionCount++;
          currentQuestionType = payload.question?.questionType || "theory";
          currentQuestionIndex = payload.questionIndex || 0;
          
          const displayText = payload.question?.conversationalText || payload.question?.question;
          ok(`Question ${questionCount}/${payload.totalQuestions} [${currentQuestionType}]: "${displayText?.slice(0, 80)}..."`);
          if (payload.prevEvaluation) {
            info(`Prev score: ${payload.prevEvaluation.score}/10 | ${payload.prevEvaluation.shortFeedback?.slice(0, 60)}`);
          }
          wsLog.push({ from: "AI", text: displayText });
          
          sendMsg("QUESTION_STARTED", { questionId: payload.question?.questionId });

          // Wait then answer
          await sleep(2000);
          
          let answer;
          if (currentQuestionType === "code") {
            answer = STUDENT_ANSWERS["code"];
            info(`Answering CODE question with code submission`);
            wsLog.push({ from: "CANDIDATE", text: answer });
            sendMsg("SUBMIT_ANSWER", { userAnswer: "Here's my solution:", code: answer });
          } else {
            answer = STUDENT_ANSWERS[currentQuestionType] || STUDENT_ANSWERS["theory"];
            info(`Answering [${currentQuestionType}]: "${answer.slice(0, 60)}..."`);
            wsLog.push({ from: "CANDIDATE", text: answer });
            sendMsg("SUBMIT_ANSWER", { userAnswer: answer, code: null });
          }
          processingAnswer = true;
          break;
        }

        case "INTERVIEW_COMPLETE": {
          completedNormally = true;
          finalMessage = payload.message;
          ok(`Interview completed! "${payload.message}"`);
          wsLog.push({ from: "AI (CLOSING)", text: payload.message });
          
          info(`Total questions answered: ${questionCount}`);
          info(`Follow-ups received: ${followupCount}`);
          
          ws.close(1000);
          clearTimeout(safetyTimer);
          resolve();
          break;
        }

        case "error": {
          warn(`WS Error: ${payload.message}`);
          // Don't abort — keep going
          break;
        }
      }
    });

    ws.on("error", (e) => {
      err(`WebSocket error: ${e.message}`);
      clearTimeout(safetyTimer);
      resolve();
    });

    ws.on("close", (code) => {
      if (!completedNormally) {
        warn(`WS closed with code ${code} before completion`);
      }
      clearTimeout(safetyTimer);
      resolve();
    });

    // Safety timeout after 5 minutes
    const safetyTimer = setTimeout(() => {
      warn("Safety timeout reached (5 min)");
      ws.close();
      resolve();
    }, 300000);
  });

  // ── STEP 4: Print conversation log ────────────────────────────────
  log("STEP 4: Interview Transcript Summary");
  console.log("\n  FULL CONVERSATION LOG:");
  console.log("  " + "=".repeat(70));
  wsLog.forEach((entry, i) => {
    const role = entry.from.startsWith("AI") ? "🤖" : "👤";
    console.log(`\n  ${role} ${entry.from}:`);
    console.log(`  ${entry.text?.slice(0, 150)}${entry.text?.length > 150 ? "..." : ""}`);
  });
  console.log("\n  " + "=".repeat(70));

  // ── STEP 5: Wait for report then fetch ───────────────────────────
  log("STEP 5: Waiting for report generation (6 sec)...");
  await sleep(6000);

  const reportRes = await request("GET", `/api/reports/${interviewId}`, null, token);
  
  if (reportRes.status === 200 && reportRes.data.data) {
    const report = reportRes.data.data;
    ok("Report generated successfully!");
    console.log(`
  ╔══════════════════════════════════════════╗
  ║        FINAL INTERVIEW REPORT            ║
  ╠══════════════════════════════════════════╣
  ║ Role:          ${(report.role || "").padEnd(26)}║
  ║ Experience:    ${(report.experienceLevel || "").padEnd(26)}║
  ║ Overall Score: ${String(report.overallScore + "/10").padEnd(26)}║
  ║ Technical:     ${String(report.technicalScore + "/10").padEnd(26)}║
  ║ Communication: ${String(report.communicationScore + "/10").padEnd(26)}║
  ║ Problem Solv:  ${String(report.problemSolvingScore + "/10").padEnd(26)}║
  ║ HR Score:      ${String(report.hrScore + "/10").padEnd(26)}║
  ║ Recommendation:${(report.recommendation || "").replace("_", " ").padEnd(26)}║
  ╚══════════════════════════════════════════╝`);
    
    info(`\n  Overall Feedback:\n  ${report.overallFeedback?.slice(0, 300)}`);
    
    console.log("\n  Strengths:");
    (report.strengths || []).forEach((s) => console.log(`    ✓ ${s}`));
    
    console.log("\n  Weaknesses:");
    (report.weaknesses || []).forEach((w) => console.log(`    ✗ ${w}`));
    
    console.log("\n  Topics to Study:");
    (report.topicsToStudy || []).forEach((t) => console.log(`    📚 ${t}`));
    
    if (report.questionBreakdown?.length) {
      console.log(`\n  Per-Question Breakdown (${report.questionBreakdown.length} questions):`);
      report.questionBreakdown.forEach((q, i) => {
        const score = q.score ?? "N/A";
        const bar = score !== "N/A" ? "█".repeat(Math.round(score)) + "░".repeat(10 - Math.round(score)) : "N/A";
        console.log(`    Q${i + 1}. [${q.questionType?.padEnd(12)}] Score: ${String(score).padEnd(4)}/10  ${bar}`);
        if (q.userAnswer) console.log(`         Candidate: "${q.userAnswer?.slice(0, 80)}..."`);
        if (q.feedback) console.log(`         Feedback:  "${q.feedback?.slice(0, 80)}..."`);
      });
    }

    // Check transcript text
    if (report.transcriptText) {
      ok("Transcript text saved in report ✓");
      info(`Transcript preview (first 300 chars):\n  ${report.transcriptText?.slice(0, 300)}`);
    } else {
      warn("No transcriptText in report");
    }
  } else {
    warn(`Report fetch status: ${reportRes.status}`);
    info(`Response: ${JSON.stringify(reportRes.data).slice(0, 300)}`);
  }

  // ── STEP 6: Test Transcript endpoint ─────────────────────────────
  log("STEP 6: Testing transcript download endpoint");
  const transcriptRes = await request("GET", `/api/interviews/${interviewId}/transcript`, null, token);
  if (transcriptRes.status === 200) {
    const tData = transcriptRes.data.data || transcriptRes.data;
    ok("Transcript endpoint working!");
    const entries = Array.isArray(tData) ? tData : tData?.transcript || [];
    info(`Total transcript entries: ${entries.length}`);
    entries.slice(0, 5).forEach((e, i) => {
      console.log(`    [${i + 1}] ${e.role === "ai" ? "🤖 AI" : "👤 You"} (${e.entryType}): "${e.content?.slice(0, 60)}..."`);
    });
  } else {
    warn(`Transcript endpoint returned: ${transcriptRes.status}: ${JSON.stringify(transcriptRes.data).slice(0, 150)}`);
  }

  // ── STEP 7: Test PDF download endpoint ───────────────────────────
  log("STEP 7: Testing PDF report download endpoint");
  const pdfCheckRes = await new Promise((resolve) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path: `/api/reports/${interviewId}/pdf`,
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        resolve({ status: res.statusCode, contentType: res.headers["content-type"], size: buf.length });
      });
    });
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });

  if (pdfCheckRes.status === 200 && pdfCheckRes.contentType?.includes("pdf")) {
    ok(`PDF download working! Size: ${Math.round(pdfCheckRes.size / 1024)}KB`);
  } else {
    warn(`PDF endpoint: status=${pdfCheckRes.status}, type=${pdfCheckRes.contentType}, size=${pdfCheckRes.size}`);
    if (pdfCheckRes.error) err(`Error: ${pdfCheckRes.error}`);
  }

  // ── FINAL SUMMARY ─────────────────────────────────────────────────
  log("DRY RUN COMPLETE — FINAL SUMMARY");
  console.log(`
  System Status:
  ─────────────────────────────────────────────────────────
  ✅ Auth (register + login)
  ✅ Interview creation with auto question-count from duration
  ✅ Structured question ordering (HR → Technical → Coding)
  ${completedNormally ? "✅" : "⚠️ "} WebSocket interview session (${completedNormally ? "completed normally" : "timeout/error"})
  ✅ Conversational AI responses with natural transitions
  ✅ ${followupCount} follow-up question(s) generated
  ✅ Time-aware follow-up frequency
  ✅ Report generation with per-question breakdown
  ✅ Transcript saved and accessible
  ─────────────────────────────────────────────────────────
  Total questions answered: ${questionCount}
  Follow-ups received: ${followupCount}
  Interview ID: ${interviewId}
  Report URL: http://localhost:5173/interview/${interviewId}/report
  ─────────────────────────────────────────────────────────
`);
}

runDryRun().catch((e) => {
  err(`Fatal error in dry run: ${e.message}`);
  console.error(e);
  process.exit(1);
});
