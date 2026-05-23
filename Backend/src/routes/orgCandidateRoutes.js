const express = require("express");
const router = express.Router();
const { protectOrg } = require("../middlewares/orgAuthMiddleware");
const { getCandidateDetail, updateCandidateStatus, exportLeaderboard } = require("../controllers/orgCandidateController");

router.use(protectOrg);

// Full candidate detail (profile + report + proctoring)
router.get("/:templateId/:interviewId", getCandidateDetail);

// Update HR status
router.patch("/:templateId/:interviewId/status", updateCandidateStatus);

// Export leaderboard CSV
router.get("/:templateId/export", exportLeaderboard);

module.exports = router;
