const Report = require("../models/Report");
const Interview = require("../models/Interview");
const { buildReport } = require("../services/reportService");
const { generatePDF } = require("../utils/pdfGenerator");
const path = require("path");
const fs = require("fs");

/**
 * GET /api/reports/:interviewId
 * Get the report for a completed interview
 */
const getReport = async (req, res, next) => {
  try {
    // Verify ownership
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      userId: req.user.id,
    }).lean();

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    let report = await Report.findOne({ interviewId: req.params.interviewId }).lean();

    // Generate if missing but interview is complete
    if (!report && ["completed", "auto_submitted"].includes(interview.status)) {
      report = await buildReport(interview._id);
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not available yet. Interview may still be in progress.",
      });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/:interviewId/pdf
 * Download report as PDF
 */
const downloadReportPDF = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const { generatePDFBuffer } = require("../services/pdfService");

    // Verify ownership
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      userId: req.user.id,
    }).lean();

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    let report = await Report.findOne({ interviewId: req.params.interviewId }).lean();
    if (!report) {
      if (["completed", "auto_submitted"].includes(interview.status)) {
        report = await buildReport(interview._id);
        report = report.toObject ? report.toObject() : report;
      } else {
        return res.status(404).json({ success: false, message: "Report not ready yet" });
      }
    }

    // Fetch user
    const user = await User.findById(interview.userId)
      .select("-password -resetPasswordOtp -resetPasswordExpire")
      .lean();

    // Attach role / info to report if missing
    if (!report.role) report.role = interview.role;
    if (!report.interviewType) report.interviewType = interview.interviewType;

    // Generate Puppeteer PDF Buffer
    const pdfBuffer = await generatePDFBuffer(report, user, false);

    const safeName = (report.role || "Interview").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const candidateName = (user?.name || "Candidate").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    const filename = `InterviewAI_Report_${candidateName}_${safeName}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/user/history
 * Get all reports for the current user
 */
const getUserReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reports = await Report.find({ userId: req.user.id })
      .select("interviewId role experienceLevel overallScore recommendation totalTimeTaken createdAt autoSubmitted")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Report.countDocuments({ userId: req.user.id });

    res.json({
      success: true,
      data: reports,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getReport, downloadReportPDF, getUserReports };
