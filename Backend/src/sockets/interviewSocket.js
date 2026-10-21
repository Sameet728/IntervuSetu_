const { WebSocketServer, WebSocket } = require("ws");
const jwt = require("jsonwebtoken");
const url = require("url");
const {
  startInterview,
  submitAnswer,
  recordViolation,
  markQuestionStarted,
  updateQuestionTimer,
  getCurrentQuestion,
  skipQuestion,
  repeatQuestion,
  provideHint,
  clarifyQuestion,
} = require("../services/interviewService");
const { handleCandidateInteraction } = require("../services/geminiService");
const Interview = require("../models/Interview");

// Track active connections: interviewId → WebSocket
const activeSessions = new Map();
const markAlive = function markAlive() {
  this.isAlive = true;
};

/**
 * Authenticate WebSocket connection via JWT query param
 */
const authenticateWS = (request) => {
  const { query } = url.parse(request.url, true);
  const token = query.token;
  if (!token || token === "demo-token" || token === "guest-token" || token === "null" || token === "undefined") {
    return { id: "660000000000000000000001", name: "Demo Candidate" };
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET || "super_secret_dev_key_intervusetu_2026");
  } catch {
    // In dev / test mode, allow guest
    return { id: "660000000000000000000001", name: "Demo Candidate" };
  }
};

/**
 * Send a structured message to a WebSocket client
 */
const send = (ws, type, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, timestamp: new Date().toISOString() }));
  }
};

/**
 * Initialize WebSocket server attached to HTTP server
 */
const initializeSocket = (server) => {
  const wss = new WebSocketServer({ server, path: "/ws/interview" });

  wss.on("connection", (ws, request) => {
    ws.isAlive = true;
    ws.on("pong", markAlive);

    // Authenticate
    const user = authenticateWS(request) || { id: "660000000000000000000001", name: "Demo Candidate" };

    const { query } = url.parse(request.url, true);
    const interviewId = query.interviewId;

    if (!interviewId) {
      send(ws, "error", { message: "interviewId required" });
      ws.close(4002, "Missing interviewId");
      return;
    }

    // Async wrapper for DB validation
    (async () => {
      try {
        const interviewRecord = await Interview.findById(interviewId).select("userId").lean();
        if (!interviewRecord) {
          send(ws, "error", { message: "Interview not found" });
          ws.close(4003, "Not found");
          return;
        }

        // Register session
        ws.userId = user.id;
        ws.interviewId = interviewId;
        ws.isAuthenticated = true; // flag to allow messages
        activeSessions.set(interviewId, ws);

        console.log(`✅ WS connected: user=${user.id} interview=${interviewId}`);
        send(ws, "connected", { message: "Connected to interview session", interviewId });
      } catch (err) {
        console.error("WS validation error:", err);
        ws.close(1011, "Internal Error");
      }
    })();

    // ── Message Dispatcher ───────────────────────────────────────────
    ws.on("message", async (raw) => {
      if (!ws.isAuthenticated) {
        send(ws, "error", { message: "Connection not fully authenticated yet" });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        send(ws, "error", { message: "Invalid JSON" });
        return;
      }

      const { type, payload = {} } = msg;

      try {
        switch (type) {
          // ── START INTERVIEW ──────────────────────────────────────
          case "START_INTERVIEW": {
            const result = await startInterview(interviewId, payload.candidateName);
            send(ws, "INTERVIEW_STARTED", {
              greeting: result.greeting,
              firstQuestion: result.firstQuestion,
              totalQuestions: result.totalQuestions,
              interviewType: result.interviewType,
              difficulty: result.difficulty,
            });
            break;
          }

          // ── QUESTION STARTED (frontend tracking) ─────────────────
          case "QUESTION_STARTED": {
            await markQuestionStarted(interviewId);
            send(ws, "QUESTION_ACKNOWLEDGED", { questionId: payload.questionId });
            break;
          }

          // ── SUBMIT ANSWER ────────────────────────────────────────
          case "SUBMIT_ANSWER": {
            const { userAnswer, code = null } = payload;

            if (!userAnswer && !code) {
              send(ws, "error", { message: "Answer is required" });
              break;
            }

            console.log(`📝 Processing answer or conversational interaction for interview ${interviewId}`);

            try {
              // 1. Check if candidate uttered a conversational command (repeat, hint, clarify, wait, skip)
              const interviewDoc = await Interview.findById(interviewId);
              if (interviewDoc && interviewDoc.status === "active") {
                const currentQ = interviewDoc.questions[interviewDoc.currentQuestionIndex || 0];
                const interaction = await handleCandidateInteraction({
                  userAnswer: userAnswer || "",
                  code: code || "",
                  currentQuestion: currentQ,
                  role: interviewDoc.role,
                  techStack: interviewDoc.techStack,
                });

                if (interaction.action === "repeat") {
                  console.log(`🔁 Candidate asked to repeat question via conversational tool`);
                  const repeated = await repeatQuestion(interviewId);
                  send(ws, "QUESTION_REPEATED", {
                    question: repeated.question,
                    type: repeated.type,
                    message: interaction.message || repeated.question,
                  });
                  break;
                }

                if (interaction.action === "hint") {
                  console.log(`💡 Candidate requested a hint via conversational tool`);
                  const hintRes = await provideHint(interviewId, code || "");
                  send(ws, "AI_HINT", {
                    hint: hintRes.hint,
                    message: hintRes.message,
                  });
                  break;
                }

                if (interaction.action === "clarify") {
                  console.log(`💬 Candidate requested clarification via conversational tool`);
                  const clarifyRes = await clarifyQuestion(interviewId, userAnswer);
                  send(ws, "AI_CLARIFICATION", {
                    clarification: clarifyRes.clarification,
                    message: clarifyRes.message,
                  });
                  break;
                }

                if (interaction.action === "wait") {
                  console.log(`⏳ Candidate asked for a moment to think`);
                  send(ws, "AI_REASSURANCE", {
                    message: interaction.message,
                  });
                  break;
                }

                if (interaction.action === "skip") {
                  console.log(`⏭ Candidate asked to skip question via conversational tool`);
                  try {
                    const result = await skipQuestion(interviewId);
                    if (result.action === "next") {
                      send(ws, "NEXT_QUESTION", {
                        question: result.nextQuestion,
                        questionIndex: result.questionIndex,
                        totalQuestions: result.totalQuestions,
                        prevEvaluation: null,
                        skipUsed: true,
                        wasSkipped: true,
                      });
                    } else if (result.action === "complete") {
                      send(ws, "INTERVIEW_COMPLETE", {
                        message: result.message,
                        evaluation: null,
                      });
                    }
                  } catch (skipError) {
                    send(ws, "SKIP_DENIED", { message: skipError.message });
                  }
                  break;
                }
              }

              // 2. Candidate submitted a technical answer / code
              send(ws, "PROCESSING", { message: "Evaluating your answer..." });
              const result = await submitAnswer(interviewId, userAnswer, code);
              console.log(`✅ Answer processed, action: ${result.action}`);

              if (result.action === "followup") {
                send(ws, "FOLLOWUP_QUESTION", {
                  question: result.followupQuestion,
                  evaluation: result.evaluation,
                });
              } else if (result.action === "next") {
                send(ws, "NEXT_QUESTION", {
                  question: result.nextQuestion,
                  questionIndex: result.questionIndex,
                  totalQuestions: result.totalQuestions,
                  prevEvaluation: result.prevEvaluation || result.evaluation,
                  skipUsed: result.skipUsed,
                  wasSkipped: result.wasSkipped || false,
                });
              } else if (result.action === "complete") {
                send(ws, "INTERVIEW_COMPLETE", {
                  message: result.message,
                  evaluation: result.evaluation,
                });
              }
            } catch (submitError) {
              console.error(`❌ Submit answer error:`, submitError);
              send(ws, "error", { message: submitError.message || "Failed to process answer" });
            }
            break;
          }

          // ── SKIP QUESTION ─────────────────────────────────────────
          case "SKIP_QUESTION": {
            console.log(`⏭ Skip request for interview ${interviewId}`);
            try {
              const result = await skipQuestion(interviewId);

              if (result.action === "next") {
                send(ws, "NEXT_QUESTION", {
                  question: result.nextQuestion,
                  questionIndex: result.questionIndex,
                  totalQuestions: result.totalQuestions,
                  prevEvaluation: null,
                  skipUsed: true,
                  wasSkipped: true,
                });
              } else if (result.action === "complete") {
                send(ws, "INTERVIEW_COMPLETE", {
                  message: result.message,
                  evaluation: null,
                });
              }
            } catch (skipError) {
              console.error(`❌ Skip error:`, skipError);
              send(ws, "SKIP_DENIED", { message: skipError.message });
            }
            break;
          }

          // ── REPEAT QUESTION ──────────────────────────────────────
          case "REPEAT_QUESTION": {
            console.log(`🔁 Repeat request for interview ${interviewId}`);
            try {
              const repeated = await repeatQuestion(interviewId);
              send(ws, "QUESTION_REPEATED", { 
                question: repeated.question,
                type: repeated.type
              });
            } catch (err) {
              send(ws, "error", { message: err.message || "Failed to repeat question" });
            }
            break;
          }

          // ── REQUEST HINT ──────────────────────────────────────────
          case "REQUEST_HINT": {
            console.log(`💡 Manual hint request for interview ${interviewId}`);
            try {
              const hintRes = await provideHint(interviewId, payload.code || "");
              send(ws, "AI_HINT", {
                hint: hintRes.hint,
                message: hintRes.message,
              });
            } catch (err) {
              send(ws, "error", { message: err.message || "Failed to provide hint" });
            }
            break;
          }

          // ── REQUEST CLARIFICATION ─────────────────────────────────
          case "REQUEST_CLARIFICATION": {
            console.log(`💬 Clarification request for interview ${interviewId}`);
            try {
              const clarifyRes = await clarifyQuestion(interviewId, payload.query || "");
              send(ws, "AI_CLARIFICATION", {
                clarification: clarifyRes.clarification,
                message: clarifyRes.message,
              });
            } catch (err) {
              send(ws, "error", { message: err.message || "Failed to clarify question" });
            }
            break;
          }


          // ── PROCTORING VIOLATION ──────────────────────────────────
          case "PROCTORING_VIOLATION": {
            const result = await recordViolation(
              interviewId,
              payload.violationType,
              payload.details
            );

            if (!result) break;

            send(ws, "VIOLATION_RECORDED", {
              violationCount: result.violationCount,
              remainingChances: result.remainingChances,
              maxViolations: result.maxViolations,
              warning: `⚠️ Warning ${result.violationCount}/${result.maxViolations}: ${getViolationMessage(payload.violationType)}`,
              violationType: payload.violationType,
            });

            if (result.autoSubmitted) {
              send(ws, "INTERVIEW_AUTO_SUBMITTED", {
                message: "Interview auto-submitted due to repeated proctoring violations.",
                violationCount: result.violationCount,
              });
              ws.close(1000, "Auto submitted");
            }
            break;
          }

          // ── TIMER HEARTBEAT ──────────────────────────────────────
          case "TIMER_UPDATE": {
            await updateQuestionTimer(
              interviewId,
              payload.questionTimeTaken,
              payload.totalTimeTaken
            );
            break;
          }

          // ── PING ──────────────────────────────────────────────────
          case "PING": {
            send(ws, "PONG", { timestamp: Date.now() });
            break;
          }

          // ── GET CURRENT STATE ─────────────────────────────────────
          case "GET_STATE": {
            const state = await getCurrentQuestion(interviewId);
            send(ws, "CURRENT_STATE", state);
            break;
          }

          default:
            send(ws, "error", { message: `Unknown event type: ${type}` });
        }
      } catch (error) {
        console.error(`WS error [${type}]:`, error.message);
        send(ws, "error", { message: error.message || "Internal server error" });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────
    ws.on("close", (code, reason) => {
      activeSessions.delete(interviewId);
      console.log(`❌ WS closed: interview=${interviewId} code=${code}`);
    });

    ws.on("error", (err) => {
      console.error(`WS error on interview=${interviewId}:`, err.message);
    });
  });

  // Heartbeat — drop dead connections every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        activeSessions.delete(ws.interviewId);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  console.log("📡 WebSocket server initialized at /ws/interview");
  return wss;
};

/**
 * Human-readable violation messages for frontend warnings
 */
const getViolationMessage = (type) => {
  const messages = {
    no_face: "No face detected in camera",
    multiple_faces: "Multiple faces detected",
    fullscreen_exit: "Fullscreen mode exited",
    tab_switch: "Tab switch detected",
    focus_lost: "Browser window lost focus",
  };
  return messages[type] || "Proctoring violation detected";
};

module.exports = { initializeSocket };
