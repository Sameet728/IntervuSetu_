const assert = require("assert");
const { computePacingMetrics, getDynamicFollowupLimit, getFollowupQuestion } = require("./src/services/evaluationService");

async function runPacingTests() {
  console.log("==================================================================");
  console.log("🧪 TESTING DYNAMIC ADAPTIVE PACING & FOLLOW-UP ENGINE");
  console.log("==================================================================");

  // ── TEST 1: Warm-up / Self Introduction ─────────────────────────────────
  console.log("\n▶ Test 1: Self Introduction should have 0 follow-ups");
  const introLimit = getDynamicFollowupLimit({
    score: 8.5,
    userAnswer: "Hi, I am Sameet, a full-stack engineer experienced in React and Node.js.",
    questionData: { questionId: "q_intro", questionType: "intro", topic: "Self Introduction" },
    pacing: { urgency: "relaxed", minsPerRemainingQ: 10, questionsLeft: 4 }
  });
  assert.strictEqual(introLimit, 0, "Intro must have 0 follow-ups");
  console.log("  ✅ PASS: Intro yielded 0 follow-ups.");

  // ── TEST 2: "I don't know" or Evasive Responses ──────────────────────────
  console.log("\n▶ Test 2: 'I don't know' should immediately move to next question");
  const evasiveAnswers = [
    "I don't know",
    "No idea",
    "Pass",
    "Not sure",
    "No clue",
    "next question",
  ];
  for (const ans of evasiveAnswers) {
    const limit = getDynamicFollowupLimit({
      score: 3.0,
      userAnswer: ans,
      questionData: { questionId: "q1", questionType: "theory" },
      pacing: { urgency: "relaxed", minsPerRemainingQ: 8, questionsLeft: 3 }
    });
    assert.strictEqual(limit, 0, `Evasive answer '${ans}' must yield 0 follow-ups`);
  }
  console.log("  ✅ PASS: All evasive answers returned 0 follow-ups.");

  // ── TEST 3: Outstanding Answer (score >= 8.8) ───────────────────────────
  console.log("\n▶ Test 3: Outstanding answer should advance to next question");
  const strongLimit = getDynamicFollowupLimit({
    score: 9.2,
    userAnswer: "In the Node.js event loop, process.nextTick callbacks run at the end of the current phase before any other microtasks or timers. Timers phase handles setTimeout and setInterval, pending callbacks handles I/O callbacks, poll phase retrieves new I/O events, check phase executes setImmediate, and close callbacks handles socket closures.",
    questionData: { questionId: "q1", questionType: "theory" },
    pacing: { urgency: "relaxed", minsPerRemainingQ: 8, questionsLeft: 3 }
  });
  assert.strictEqual(strongLimit, 0, "Score >= 8.8 must yield 0 follow-ups");
  console.log("  ✅ PASS: Outstanding answer (9.2/10) yielded 0 follow-ups.");

  // ── TEST 4: Critical Time Crunch (< 3m per remaining Q) ────────────────
  console.log("\n▶ Test 4: Critical time crunch should suppress follow-ups to cover remaining questions");
  const mockInterviewCrunch = {
    targetDuration: 30,
    startedAt: new Date(Date.now() - 25 * 60 * 1000), // 25 mins elapsed, 5 mins remaining
    currentQuestionIndex: 1, // at Q2
    questions: [
      { questionId: "q0", status: "completed" },
      { questionId: "q1", status: "in_progress" },
      { questionId: "q2", status: "pending", questionType: "theory" },
      { questionId: "q3", status: "pending", questionType: "code" }, // coding question pending!
    ],
  };
  const pacingCrunch = computePacingMetrics(mockInterviewCrunch);
  console.log("  Pacing metrics:", {
    remainingMins: pacingCrunch.remainingMins,
    questionsLeft: pacingCrunch.questionsLeft,
    hasUpcomingCodeQ: pacingCrunch.hasUpcomingCodeQ,
    minsPerRemainingQ: pacingCrunch.minsPerRemainingQ,
    urgency: pacingCrunch.urgency,
    targetFollowupSize: pacingCrunch.targetFollowupSize,
  });
  assert.strictEqual(pacingCrunch.urgency, "critical", "Should detect critical urgency");
  assert.strictEqual(pacingCrunch.targetFollowupSize, "short", "Should request short follow-up size");

  const crunchLimit = getDynamicFollowupLimit({
    score: 6.0,
    userAnswer: "IndexedDB is a client side storage mechanism for large datasets.",
    questionData: { questionId: "q1", questionType: "theory" },
    pacing: pacingCrunch,
  });
  assert.strictEqual(crunchLimit, 0, "Critical urgency must yield 0 follow-ups to preserve time for coding");
  console.log("  ✅ PASS: Critical crunch suppressed follow-up to reserve time for pending coding question.");

  // ── TEST 5: Tight Time Budget (< 5m/Q) ──────────────────────────────────
  console.log("\n▶ Test 5: Tight time allows 1 rapid follow-up only for weak answers");
  const mockInterviewTight = {
    targetDuration: 40,
    startedAt: new Date(Date.now() - 28 * 60 * 1000), // 28 mins elapsed, 12 mins remaining
    currentQuestionIndex: 1, // index 1 means 3 questions left (indices 2, 3, 4)
    questions: [
      { questionId: "q0", status: "completed" },
      { questionId: "q1", status: "in_progress" },
      { questionId: "q2", status: "pending", questionType: "theory" },
      { questionId: "q3", status: "pending", questionType: "theory" },
      { questionId: "q4", status: "pending", questionType: "theory" },
    ],
  };
  const pacingTight = computePacingMetrics(mockInterviewTight);

  console.log("  Pacing metrics:", {
    remainingMins: pacingTight.remainingMins,
    questionsLeft: pacingTight.questionsLeft,
    minsPerRemainingQ: pacingTight.minsPerRemainingQ,
    urgency: pacingTight.urgency,
  });

  const tightWeakLimit = getDynamicFollowupLimit({
    score: 4.5,
    userAnswer: "CSS grid is for 2D and flexbox is for 1D.",
    questionData: { questionId: "q1", questionType: "theory" },
    pacing: pacingTight,
  });
  assert.strictEqual(tightWeakLimit, 1, "Tight time with weak answer allows 1 rapid follow-up");

  const tightGoodLimit = getDynamicFollowupLimit({
    score: 7.5,
    userAnswer: "CSS Grid is a two-dimensional layout system dealing with columns and rows simultaneously, whereas Flexbox is one-dimensional.",
    questionData: { questionId: "q1", questionType: "theory" },
    pacing: pacingTight,
  });
  assert.strictEqual(tightGoodLimit, 0, "Tight time with good answer advances without follow-up");
  console.log("  ✅ PASS: Tight budget selectively asks 1 follow-up only when weak.");

  // ── TEST 6: Relaxed Time Budget (> 8m/Q) ────────────────────────────────
  console.log("\n▶ Test 6: Relaxed time budget allows deeper probing");
  const mockInterviewRelaxed = {
    targetDuration: 45,
    startedAt: new Date(Date.now() - 5 * 60 * 1000), // 40 mins remaining
    currentQuestionIndex: 1,
    questions: [
      { questionId: "q0", status: "completed" },
      { questionId: "q1", status: "in_progress" },
      { questionId: "q2", status: "pending", questionType: "theory" },
      { questionId: "q3", status: "pending", questionType: "theory" },
    ],
  };
  const pacingRelaxed = computePacingMetrics(mockInterviewRelaxed);
  assert.strictEqual(pacingRelaxed.urgency, "relaxed");

  const relaxedLimit = getDynamicFollowupLimit({
    score: 3.5,
    userAnswer: "I think database replication means copying the database so if one fails we can use another one but I am not completely sure how conflicts work.",
    questionData: { questionId: "q1", questionType: "theory" },
    pacing: pacingRelaxed,
  });
  assert(relaxedLimit >= 1, "Relaxed budget allows deep follow-ups for struggling attempts");
  console.log(`  ✅ PASS: Relaxed budget permitted ${relaxedLimit} follow-up(s).`);

  // ── TEST 7: Brevity and Sizing of Follow-up Question ────────────────────
  console.log("\n▶ Test 7: Follow-up question sizing adapts to pacing urgency");
  const followupShort = await getFollowupQuestion(
    { question: "How would you design a distributed caching layer?", questionType: "theory" },
    "I would use Redis with LRU eviction.",
    null,
    [],
    "",
    pacingCrunch
  );
  console.log("  Short/Urgent follow-up:", followupShort);
  const shortWordCount = followupShort.split(/\s+/).filter(Boolean).length;
  console.log(`  Word count: ${shortWordCount} (target: <= 16 words)`);
  assert(shortWordCount <= 20, "Short follow-up should be concise and direct");

  console.log("\n==================================================================");
  console.log("🎉 ALL ADAPTIVE PACING & DYNAMIC FOLLOW-UP TESTS PASSED!");
  console.log("==================================================================");
}

runPacingTests().catch((err) => {
  console.error("❌ Pacing test failed:", err);
  process.exit(1);
});
