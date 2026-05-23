const express = require("express");
const router = express.Router();
const {
  createTest, getTests, getTestByShareCode,
  closeTest, deleteTest,
  getLeaderboard, getAnalytics,
  updateCandidateStatus, sendInvite, exportCSV,
} = require("../controllers/orgAptitudeController");
const { protectOrg } = require("../middlewares/orgAuthMiddleware");

// Public route — anyone can fetch test info using share code
router.get("/join/:shareCode", getTestByShareCode);

// Protected org routes
router.use(protectOrg);
router.post("/create", createTest);
router.get("/", getTests);
router.patch("/:testId/close", closeTest);
router.delete("/:testId", deleteTest);
router.get("/:testId/leaderboard", getLeaderboard);
router.get("/:testId/analytics", getAnalytics);
router.patch("/:testId/candidate/:attemptId/status", updateCandidateStatus);
router.post("/:testId/invite", sendInvite);
router.get("/:testId/export", exportCSV);

module.exports = router;
