const express = require("express");
const router = express.Router();

const WHISTLE_URL = process.env.WHISTLE_URL || "http://127.0.0.1:5001";

const { testGroqKey } = require("../services/groqService");

const DEFAULT_TECH_KEYWORDS = [
  "React", "Fiber", "Virtual DOM", "Node.js", "Express", "MongoDB",
  "SQL", "JWT", "TypeScript", "JavaScript", "Docker", "Kubernetes",
  "API", "REST", "GraphQL", "Redis", "Kafka", "PostgreSQL", "AWS",
  "Microservices", "State", "Hooks", "Redux", "Tailwind", "Next.js"
];

// ─── GET /api/audio/whistle/status ──────────────────────────────────
router.get("/whistle/status", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${WHISTLE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (resp.ok) {
      const data = await resp.json();
      return res.json({
        available: true,
        stt: data.stt || { model: "whistle-16.9mb", ready: true },
        llm: data.llm || { model: "qwen2.5-0.5b", ready: true },
        model: (data.stt && data.stt.model) || data.model || "whistle-16.9mb",
        engine: "cactus-needle-cpu + llama-cpp-cpu",
        languages: ["en", "de", "fr", "es", "it", "nl", "pl"]
      });
    }
  } catch (err) {
    // Local AI server not reachable
  }

  return res.json({
    available: false,
    message: "Local AI microservice is offline or initializing"
  });
});

// ─── GET /api/audio/models/status ──────────────────────────────────
router.get("/models/status", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${WHISTLE_URL}/models/status`, { signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const data = await resp.json();
      return res.json(data);
    }
  } catch (err) {
    // offline
  }

  return res.json({
    success: false,
    whistle: { name: "Whistle Neural STT", size_mb: 16.9, ready: false, offline_ready: false },
    qwen: { name: "Qwen 2.5 0.5B Instruct", size_mb: 468.6, ready: false, offline_ready: false },
    unlimited_interviews_ready: false,
    message: "Local AI server is offline. Launch with: python Backend/whistle_server.py"
  });
});

// ─── POST /api/audio/test-groq ──────────────────────────────────────
router.post("/test-groq", async (req, res) => {
  try {
    const { apiKey } = req.body;
    const result = await testGroqKey(apiKey);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/audio/models/download ────────────────────────────────
router.post("/models/download", async (req, res) => {
  try {
    const resp = await fetch(`${WHISTLE_URL}/models/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: "Could not connect to Local AI server: " + err.message });
  }
});

// ─── POST /api/audio/local-ai/evaluate ──────────────────────────────
router.post("/local-ai/evaluate", async (req, res) => {
  try {
    const resp = await fetch(`${WHISTLE_URL}/interview/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/audio/local-ai/cross-question ────────────────────────
router.post("/local-ai/cross-question", async (req, res) => {
  try {
    const resp = await fetch(`${WHISTLE_URL}/interview/cross-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/audio/local-ai/chat ──────────────────────────────────
router.post("/local-ai/chat", async (req, res) => {
  try {
    const resp = await fetch(`${WHISTLE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });

    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream") && resp.body) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const { Readable } = require("stream");
      Readable.fromWeb(resp.body).pipe(res);
      return;
    }

    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/audio/whistle/transcribe ─────────────────────────────
router.post("/whistle/transcribe", async (req, res) => {
  try {
    const { audio_base64, keywords = [], language = "en", word_timestamps = true } = req.body;

    if (!audio_base64) {
      return res.status(400).json({ success: false, message: "audio_base64 is required" });
    }

    const mergedKeywords = Array.from(new Set([...DEFAULT_TECH_KEYWORDS, ...(keywords || [])]));

    const resp = await fetch(`${WHISTLE_URL}/transcribe-base64`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64,
        keywords: mergedKeywords,
        language,
        word_timestamps
      })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({
        success: false,
        message: errData.error || "Whistle transcription failed"
      });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Could not connect to Whistle transcription service: " + err.message
    });
  }
});

module.exports = router;
