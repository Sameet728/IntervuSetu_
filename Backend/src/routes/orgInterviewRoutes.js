const express = require("express");
const router = express.Router();
const { protectOrg } = require("../middlewares/orgAuthMiddleware");
const {
  createTemplate, getTemplates, getTemplate, updateTemplate,
  deleteTemplate, closeTemplate, getLeaderboard, getAnalytics, sendInvite,
} = require("../controllers/orgInterviewController");

// All routes require org auth
router.use(protectOrg);

router.post("/", createTemplate);
router.get("/", getTemplates);
router.get("/:templateId", getTemplate);
router.put("/:templateId", updateTemplate);
router.delete("/:templateId", deleteTemplate);
router.patch("/:templateId/close", closeTemplate);
router.get("/:templateId/leaderboard", getLeaderboard);
router.get("/:templateId/analytics", getAnalytics);
router.post("/:templateId/invite", sendInvite);

module.exports = router;
