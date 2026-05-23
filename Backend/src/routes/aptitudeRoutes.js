const express = require("express");
const router = express.Router();
const { startRandomTest, submitAttempt, getReport, getHistory, getCompanies, getTopics, checkAvailability, downloadAptitudePDF } = require("../controllers/aptitudeController");
const { protect } = require("../middlewares/authMiddleware");

router.use(protect);

router.post("/check-availability", checkAvailability);
router.get("/history", getHistory);
router.get("/companies", getCompanies);
router.get("/topics", getTopics);
router.post("/start", startRandomTest);
router.post("/:attemptId/submit", submitAttempt);
router.get("/:attemptId/report", getReport);
router.get("/:attemptId/pdf", downloadAptitudePDF);

module.exports = router;
