const express = require("express");
const router = express.Router();
const {
  getReport,
  downloadReportPDF,
  getUserReports,
} = require("../controllers/reportController");
const { protect } = require("../middlewares/authMiddleware");

// All routes are protected
router.use(protect);

// GET /api/reports/user/history          → all reports for current user
router.get("/user/history", getUserReports);

// GET /api/reports/:interviewId          → get report JSON
router.get("/:interviewId", getReport);

// GET /api/reports/:interviewId/pdf      → download PDF
router.get("/:interviewId/pdf", downloadReportPDF);

module.exports = router;
