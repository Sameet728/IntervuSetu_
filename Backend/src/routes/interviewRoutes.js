const express = require("express");
const router = express.Router();
const {
  getTemplateInfo,
  createInterview,
  getMyInterviews,
  getInterview,
  getTranscript,
  submitInterview,
  deleteInterview,
} = require("../controllers/interviewController");
const { protect } = require("../middlewares/authMiddleware");
const { createInterviewValidation } = require("../middlewares/validationMiddleware");
const { checkUserPlan } = require("../middlewares/planMiddleware");

// PUBLIC — no auth required
// GET /api/interviews/join/:shareCode → template info for join page
router.get("/join/:shareCode", getTemplateInfo);

// All routes below are protected
router.use(protect);

// POST   /api/interviews/create       → create interview + generate questions
router.post("/create", checkUserPlan, createInterviewValidation, createInterview);

// GET    /api/interviews               → list all user's interviews
router.get("/", getMyInterviews);

// GET    /api/interviews/:id           → get single interview
router.get("/:id", getInterview);

// GET    /api/interviews/:id/transcript → get full transcript
router.get("/:id/transcript", getTranscript);

// POST   /api/interviews/:id/submit   → manually submit interview
router.post("/:id/submit", submitInterview);

// DELETE /api/interviews/:id           → delete interview
router.delete("/:id", deleteInterview);

module.exports = router;

