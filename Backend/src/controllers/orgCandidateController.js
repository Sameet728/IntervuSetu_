const Interview = require("../models/Interview");
const Report = require("../models/Report");
const User = require("../models/User");
const InterviewTemplate = require("../models/InterviewTemplate");
const { Parser } = require("json2csv");

/**
 * GET /api/org/candidates/:templateId/:interviewId
 * Full candidate detail: profile + report + proctoring
 */
const getCandidateDetail = async (req, res, next) => {
  try {
    const { templateId, interviewId } = req.params;

    // Verify template belongs to this org
    const template = await InterviewTemplate.findOne({
      _id: templateId,
      organizationId: req.org._id,
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    // Get interview
    const interview = await Interview.findOne({ _id: interviewId, templateId }).lean();
    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found." });
    }

    // Get user profile
    const user = await User.findById(interview.userId)
      .select("-password -__v -interviews")
      .lean();

    // Get report
    const report = await Report.findOne({ interviewId }).lean();

    res.json({
      success: true,
      data: {
        candidate: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
          profilePicture: user?.profilePicture,
          userType: user?.userType,
          college: user?.college,
          company: user?.company,
          year: user?.year,
          branch: user?.branch,
          yearsOfExperience: user?.yearsOfExperience,
          skills: user?.skills,
          experienceLevel: user?.experienceLevel,
          targetRole: user?.targetRole,
          resumeUrl: user?.resumeUrl,
          resumeOriginalName: user?.resumeOriginalName,
        },
        interview: {
          id: interview._id,
          status: interview.status,
          attemptNumber: interview.attemptNumber,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          totalTimeTaken: interview.totalTimeTaken,
          autoSubmitted: interview.autoSubmitted,
          violationCount: interview.violationCount,
          violations: interview.violations,
          transcript: interview.transcript,
        },
        report: report
          ? {
              overallScore: report.overallScore,
              technicalScore: report.technicalScore,
              communicationScore: report.communicationScore,
              problemSolvingScore: report.problemSolvingScore,
              hrScore: report.hrScore,
              codeQualityScore: report.codeQualityScore,
              strengths: report.strengths,
              weaknesses: report.weaknesses,
              overallFeedback: report.overallFeedback,
              recommendation: report.recommendation,
              improvementAreas: report.improvementAreas,
              topicsToStudy: report.topicsToStudy,
              questionBreakdown: report.questionBreakdown,
              totalTimeTaken: report.totalTimeTaken,
              averageTimePerQuestion: report.averageTimePerQuestion,
              badge: report.badge,
              candidateTags: report.candidateTags,
              strengthSummary: report.strengthSummary,
              weaknessSummary: report.weaknessSummary,
              candidateStatus: report.candidateStatus,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/org/candidates/:templateId/:interviewId/status
 * Update candidateStatus on report
 */
const updateCandidateStatus = async (req, res, next) => {
  try {
    const { templateId, interviewId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "shortlisted", "selected", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    // Verify template belongs to org
    const template = await InterviewTemplate.findOne({
      _id: templateId,
      organizationId: req.org._id,
    });
    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    const report = await Report.findOneAndUpdate(
      { interviewId },
      { candidateStatus: status },
      { new: true }
    );

    if (!report) return res.status(404).json({ success: false, message: "Report not found." });

    res.json({ success: true, data: { candidateStatus: report.candidateStatus } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/candidates/:templateId/export
 * Export leaderboard as CSV
 */
const exportLeaderboard = async (req, res, next) => {
  try {
    const { templateId } = req.params;

    const template = await InterviewTemplate.findOne({
      _id: templateId,
      organizationId: req.org._id,
    }).lean();
    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    const interviews = await Interview.find({
      templateId,
      status: { $in: ["completed", "auto_submitted"] },
    }).lean();

    const interviewIds = interviews.map((i) => i._id);
    const userIds = [...new Set(interviews.map((i) => i.userId.toString()))];

    const [reports, users] = await Promise.all([
      Report.find({ interviewId: { $in: interviewIds } }).lean(),
      User.find({ _id: { $in: userIds } }).select("name email college company userType skills").lean(),
    ]);

    const reportMap = {};
    reports.forEach((r) => { reportMap[r.interviewId.toString()] = r; });

    const userMap = {};
    users.forEach((u) => { userMap[u._id.toString()] = u; });

    let rows = interviews.map((iv) => {
      const r = reportMap[iv._id.toString()] || {};
      const u = userMap[iv.userId.toString()] || {};
      return {
        Name: u.name || "",
        Email: u.email || "",
        College_Company: u.college || u.company || "",
        Overall_Score: r.overallScore ?? 0,
        Technical_Score: r.technicalScore ?? 0,
        Communication_Score: r.communicationScore ?? 0,
        Problem_Solving_Score: r.problemSolvingScore ?? 0,
        Time_Minutes: iv.totalTimeTaken ? Math.round(iv.totalTimeTaken / 60) : 0,
        Status: iv.autoSubmitted ? "Auto-submitted" : "Completed",
        Violations: iv.violationCount || 0,
        Badge: r.badge || "",
        Tags: (r.candidateTags || []).join("; "),
        HR_Status: r.candidateStatus || "pending",
        Recommendation: r.recommendation || "",
      };
    });

    rows.sort((a, b) => b.Overall_Score - a.Overall_Score);
    rows = rows.map((row, i) => ({ Rank: i + 1, ...row }));

    const parser = new Parser({ fields: Object.keys(rows[0] || {}) });
    const csv = parser.parse(rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leaderboard_${template.title.replace(/\s+/g, "_")}_${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCandidateDetail, updateCandidateStatus, exportLeaderboard };
