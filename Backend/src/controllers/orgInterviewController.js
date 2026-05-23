const InterviewTemplate = require("../models/InterviewTemplate");
const Interview = require("../models/Interview");
const Report = require("../models/Report");
const User = require("../models/User");
const { generateQuestions } = require("../services/geminiService");
const { sendInviteEmail, sendBulkInvites } = require("../services/emailService");

/**
 * POST /api/org/interviews
 * Create interview template with AI-generated questions
 */
const createTemplate = async (req, res, next) => {
  try {
    const {
      title, role, interviewType = "mixed", difficulty = "adaptive",
      duration = 45, questionCount = 8, techStack = [],
      instructions = "", deadline, maxAttempts = 1, proctoringEnabled = true,
    } = req.body;

    if (!title || !role) {
      return res.status(400).json({ success: false, message: "title and role are required." });
    }

    const parsedTechStack = Array.isArray(techStack)
      ? techStack
      : techStack.split(",").map((t) => t.trim()).filter(Boolean);

    const count = Math.min(Math.max(parseInt(questionCount), 3), 20);

    // Generate questions via Gemini
    const questions = await generateQuestions({
      role,
      experienceLevel: "mid", // org sets difficulty instead
      techStack: parsedTechStack,
      count,
      interviewType,
      difficulty,
    });

    const template = await InterviewTemplate.create({
      organizationId: req.org._id,
      title,
      role,
      interviewType,
      difficulty,
      duration,
      questionCount: count,
      techStack: parsedTechStack,
      instructions,
      deadline: deadline || null,
      maxAttempts: parseInt(maxAttempts),
      proctoringEnabled,
      questions,
      status: "active",
    });

    res.status(201).json({
      success: true,
      data: {
        templateId: template._id,
        title: template.title,
        shareCode: template.shareCode,
        joinUrl: `${process.env.CLIENT_URL}/interview/join/${template.shareCode}`,
        questions: template.questions.map((q) => ({
          questionId: q.questionId,
          question: q.question,
          questionType: q.questionType,
          difficulty: q.difficulty,
          topic: q.topic,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/interviews
 * List all templates for this org
 */
const getTemplates = async (req, res, next) => {
  try {
    const templates = await InterviewTemplate.find({ organizationId: req.org._id })
      .select("-questions")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/interviews/:templateId
 */
const getTemplate = async (req, res, next) => {
  try {
    const template = await InterviewTemplate.findOne({
      _id: req.params.templateId,
      organizationId: req.org._id,
    }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/org/interviews/:templateId
 */
const updateTemplate = async (req, res, next) => {
  try {
    const allowed = ["title", "instructions", "deadline", "maxAttempts", "status", "proctoringEnabled"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const template = await InterviewTemplate.findOneAndUpdate(
      { _id: req.params.templateId, organizationId: req.org._id },
      updates,
      { new: true }
    );

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/org/interviews/:templateId
 */
const deleteTemplate = async (req, res, next) => {
  try {
    const template = await InterviewTemplate.findOneAndDelete({
      _id: req.params.templateId,
      organizationId: req.org._id,
    });

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    res.json({ success: true, message: "Template deleted." });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/org/interviews/:templateId/close
 */
const closeTemplate = async (req, res, next) => {
  try {
    const template = await InterviewTemplate.findOneAndUpdate(
      { _id: req.params.templateId, organizationId: req.org._id },
      { status: "closed" },
      { new: true }
    );

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    res.json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/interviews/:templateId/leaderboard
 * Ranked leaderboard of all candidates for this template
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const { scoreMin, scoreMax, status, search } = req.query;

    const template = await InterviewTemplate.findOne({
      _id: req.params.templateId,
      organizationId: req.org._id,
    }).lean();

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    // Find all completed interviews for this template
    const interviewFilter = {
      templateId: req.params.templateId,
      status: { $in: ["completed", "auto_submitted"] },
    };

    const interviews = await Interview.find(interviewFilter)
      .select("userId totalTimeTaken status attemptNumber autoSubmitted violationCount createdAt completedAt")
      .lean();

    const interviewIds = interviews.map((i) => i._id);
    const userIds = [...new Set(interviews.map((i) => i.userId.toString()))];

    // Fetch reports
    const reports = await Report.find({ interviewId: { $in: interviewIds } })
      .select("interviewId overallScore technicalScore communicationScore problemSolvingScore codeQualityScore badge candidateTags strengthSummary weaknessSummary candidateStatus recommendation")
      .lean();

    const reportMap = {};
    reports.forEach((r) => { reportMap[r.interviewId.toString()] = r; });

    // Fetch users
    const users = await User.find({ _id: { $in: userIds } })
      .select("name email college company userType year branch skills experienceLevel yearsOfExperience profilePicture")
      .lean();

    const userMap = {};
    users.forEach((u) => { userMap[u._id.toString()] = u; });

    // Build leaderboard entries
    let entries = interviews.map((iv) => {
      const report = reportMap[iv._id.toString()] || {};
      const user = userMap[iv.userId.toString()] || {};

      return {
        interviewId: iv._id,
        userId: iv.userId,
        candidateName: user.name || "Unknown",
        email: user.email,
        college: user.college,
        company: user.company,
        userType: user.userType,
        profilePicture: user.profilePicture,
        overallScore: report.overallScore ?? 0,
        technicalScore: report.technicalScore ?? 0,
        communicationScore: report.communicationScore ?? 0,
        problemSolvingScore: report.problemSolvingScore ?? 0,
        codeQualityScore: report.codeQualityScore ?? null,
        totalTimeTaken: iv.totalTimeTaken || 0,
        status: iv.autoSubmitted ? "Auto-submitted" : "Completed",
        attemptNumber: iv.attemptNumber || 1,
        violationCount: iv.violationCount || 0,
        badge: report.badge || null,
        candidateTags: report.candidateTags || [],
        strengthSummary: report.strengthSummary || "",
        weaknessSummary: report.weaknessSummary || "",
        candidateStatus: report.candidateStatus || "pending",
        recommendation: report.recommendation || null,
        completedAt: iv.completedAt,
      };
    });

    // Apply filters
    if (scoreMin) entries = entries.filter((e) => e.overallScore >= parseFloat(scoreMin));
    if (scoreMax) entries = entries.filter((e) => e.overallScore <= parseFloat(scoreMax));
    if (status && status !== "all") entries = entries.filter((e) => e.candidateStatus === status);
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter((e) =>
        e.candidateName.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
      );
    }

    // Sort: score DESC then time ASC
    entries.sort((a, b) => {
      if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
      return a.totalTimeTaken - b.totalTimeTaken;
    });

    // Add rank
    entries = entries.map((e, i) => ({ ...e, rank: i + 1 }));

    res.json({
      success: true,
      template: {
        title: template.title,
        role: template.role,
        interviewType: template.interviewType,
        stats: template.stats,
      },
      data: entries,
      total: entries.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/interviews/:templateId/analytics
 */
const getAnalytics = async (req, res, next) => {
  try {
    const template = await InterviewTemplate.findOne({
      _id: req.params.templateId,
      organizationId: req.org._id,
    }).lean();

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    const totalAttempts = await Interview.countDocuments({ templateId: req.params.templateId });
    const completedAttempts = await Interview.countDocuments({
      templateId: req.params.templateId,
      status: { $in: ["completed", "auto_submitted"] },
    });

    const reports = await Report.find({ templateId: req.params.templateId })
      .select("overallScore technicalScore communicationScore problemSolvingScore badge candidateStatus")
      .lean();

    const scores = reports.map((r) => r.overallScore).filter(Boolean);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length ? Math.max(...scores) : 0;

    const statusCounts = { pending: 0, shortlisted: 0, selected: 0, rejected: 0 };
    reports.forEach((r) => { if (statusCounts[r.candidateStatus] !== undefined) statusCounts[r.candidateStatus]++; });

    const badgeCounts = {};
    reports.forEach((r) => {
      if (r.badge) badgeCounts[r.badge] = (badgeCounts[r.badge] || 0) + 1;
    });

    const avgTechnical = reports.reduce((a,b) => a + (b.technicalScore || 0), 0) / (reports.length || 1);
    const avgCommunication = reports.reduce((a,b) => a + (b.communicationScore || 0), 0) / (reports.length || 1);
    const avgProblemSolving = reports.reduce((a,b) => a + (b.problemSolvingScore || 0), 0) / (reports.length || 1);

    res.json({
      success: true,
      data: {
        totalAttempts,
        completedAttempts,
        dropOffCount: totalAttempts - completedAttempts,
        completionRate: totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
        avgScore: Math.round(avgScore * 10) / 10,
        highestScore: Math.round(highestScore * 10) / 10,
        statusDistribution: statusCounts,
        badgeDistribution: badgeCounts,
        skillHeatmap: {
          technical: Math.round(avgTechnical * 10) / 10,
          communication: Math.round(avgCommunication * 10) / 10,
          problemSolving: Math.round(avgProblemSolving * 10) / 10,
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/org/interviews/:templateId/invite
 * Send email invite(s)
 */
const sendInvite = async (req, res, next) => {
  try {
    const { emails } = req.body; // array or single string

    const template = await InterviewTemplate.findOne({
      _id: req.params.templateId,
      organizationId: req.org._id,
    }).lean();

    if (!template) return res.status(404).json({ success: false, message: "Template not found." });

    const joinUrl = `${process.env.CLIENT_URL}/interview/join/${template.shareCode}`;

    const emailList = Array.isArray(emails) ? emails : [emails];

    const result = await sendBulkInvites({
      emails: emailList,
      orgName: req.org.name,
      interviewTitle: template.title,
      role: template.role,
      joinUrl,
      deadline: template.deadline,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  closeTemplate,
  getLeaderboard,
  getAnalytics,
  sendInvite,
};
