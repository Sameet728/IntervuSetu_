const Interview = require("../models/Interview");
const Report = require("../models/Report");
const InterviewTemplate = require("../models/InterviewTemplate");
const User = require("../models/User");
const { generateFinalReport, generateCandidateTags } = require("./geminiService");
const { generateReportPdf } = require("./pdfGenerator");
const { sendReportEmail } = require("./emailService");
const { formatTranscriptText } = require("./memoryService");

/**
 * Build and save the final interview report.
 * Called when interview completes (normally or via auto-submit).
 */
const buildReport = async (interviewId) => {
  const interview = await Interview.findById(interviewId).lean();
  if (!interview) throw new Error("Interview not found");

  const completedQuestions = interview.questions.filter(
    (q) => q.status === "completed"
  );

  // ── AI-generated analysis ──────────────────────────────────────────
  const aiAnalysis = await generateFinalReport({
    role: interview.role,
    experienceLevel: interview.experienceLevel,
    techStack: interview.techStack,
    interviewType: interview.interviewType || "mixed",
    questionsData: completedQuestions.map((q) => ({
      question: q.question,
      questionType: q.questionType,
      difficulty: q.difficulty,
      score: q.score,
      feedback: q.feedback,
      timeTaken: q.timeTaken,
    })),
    longTermSummary: interview.longTermSummary,
  });

  // ── Per-question breakdown with user answers ────────────────────────
  const questionBreakdown = completedQuestions.map((q) => {
    // Get the main answer (first answer, type "main")
    const mainAnswer = q.answers?.find((a) => a.type === "main");
    const userAnswer = mainAnswer?.answer || q.answers?.[0]?.answer || "";
    const userCode = mainAnswer?.code || null;

    return {
      questionId: q.questionId,
      question: q.question,
      questionType: q.questionType,
      difficulty: q.difficulty,
      score: q.score ?? 0,
      feedback: q.feedback,
      idealAnswer: q.idealAnswer,
      userAnswer,           // NEW: stores what candidate actually said
      userCode,             // NEW: stores candidate's code submission
      timeTaken: q.timeTaken,
      followupCount: q.followupCount,
      strengths: q.strengths || [],
      weaknesses: q.weaknesses || [],
    };
  });

  // ── Timing stats ──────────────────────────────────────────────────
  const totalTime = interview.totalTimeTaken || 0;
  const avgTime =
    completedQuestions.length > 0
      ? Math.round(totalTime / completedQuestions.length)
      : 0;

  // ── Full transcript as text ───────────────────────────────────────
  const transcriptText = formatTranscriptText(interview.transcript);

  // ── Save Report ──────────────────────────────────────────────────
  const report = await Report.findOneAndUpdate(
    { interviewId: interview._id },
    {
      interviewId: interview._id,
      userId: interview.userId,
      role: interview.role,
      experienceLevel: interview.experienceLevel,
      techStack: interview.techStack,
      interviewType: interview.interviewType || "mixed",
      difficulty: interview.difficulty || "adaptive",

      overallScore: aiAnalysis.overallScore,
      communicationScore: aiAnalysis.communicationScore,
      technicalScore: aiAnalysis.technicalScore,
      problemSolvingScore: aiAnalysis.problemSolvingScore,
      hrScore: aiAnalysis.hrScore,
      codeQualityScore: aiAnalysis.codeQualityScore || null,

      strengths: aiAnalysis.strengths,
      weaknesses: aiAnalysis.weaknesses,
      overallFeedback: aiAnalysis.overallFeedback,
      recommendation: aiAnalysis.recommendation,
      improvementAreas: aiAnalysis.improvementAreas || [],
      topicsToStudy: aiAnalysis.topicsToStudy || [],

      questionBreakdown,
      totalTimeTaken: totalTime,
      averageTimePerQuestion: avgTime,

      violationCount: interview.violationCount,
      autoSubmitted: interview.autoSubmitted,
      transcriptText,
    },
    { upsert: true, new: true }
  );

  // Link report to interview
  await Interview.findByIdAndUpdate(interviewId, { reportId: report._id });

  // ── Org enrichment (async, non-blocking) ─────────────────────────
  if (interview.templateId && interview.organizationId) {
    enrichOrgReport(report, interview).catch((e) =>
      console.error("Org enrichment error:", e.message)
    );
  }

  // Generate PDF & Send Email asynchronously
  (async () => {
    try {
      const user = await User.findById(interview.userId)
        .select("-password -resetPasswordOtp -resetPasswordExpire")
        .lean();
      if (user && user.email) {
        const { generatePDF } = require("./pdfGenerator"); // uses old basic one for file-save path
        const pdfPath = await generateReportPdf(report, user, interview);
        const joinUrl = `${process.env.CLIENT_URL}/interview/${interview._id}/report`;
        
        await sendReportEmail({
          to: user.email,
          candidateName: user.name,
          role: interview.role,
          overallScore: report.overallScore,
          summary: report.overallFeedback,
          joinUrl,
          pdfPath
        });
      }
    } catch (e) {
      console.error("Error sending report email:", e.message);
    }
  })();

  return report;
};

/**
 * Async enrichment: AI tags + template stats update
 */
const enrichOrgReport = async (report, interview) => {
  try {
    // Generate AI tags
    const tagResult = await generateCandidateTags({
      role: interview.role,
      overallScore: report.overallScore,
      technicalScore: report.technicalScore,
      communicationScore: report.communicationScore,
      problemSolvingScore: report.problemSolvingScore,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      timeTaken: interview.totalTimeTaken,
      interviewType: interview.interviewType,
    });

    // Calculate a badge locally since AI only returns strengths/weaknesses now
    let badge = null;
    if (report.overallScore >= 8.5) badge = "Top Performer";
    else if (report.communicationScore >= 8) badge = "Strong Communicator";
    else if (report.technicalScore >= 8.5) badge = "Strong in DSA";

    const candidateTags = [
      ...(tagResult.strengths || []).slice(0, 2).map((s) => `Strong in: ${s}`),
      ...(tagResult.weaknesses || []).slice(0, 2).map((w) => `Weak in: ${w}`),
    ];

    // Store org link + tags on report
    await Report.findByIdAndUpdate(report._id, {
      templateId: interview.templateId,
      organizationId: interview.organizationId,
      candidateTags,
      badge,
      strengthSummary: tagResult.summary || "",
    });

    // Recalculate template stats
    const allReports = await Report.find({
      templateId: interview.templateId,
      overallScore: { $gt: 0 },
    }).select("overallScore").lean();

    const scores = allReports.map((r) => r.overallScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const totalAttempts = await Interview.countDocuments({ templateId: interview.templateId });
    const completedAttempts = await Interview.countDocuments({
      templateId: interview.templateId,
      status: { $in: ["completed", "auto_submitted"] },
    });

    await InterviewTemplate.findByIdAndUpdate(interview.templateId, {
      "stats.totalAttempts": totalAttempts,
      "stats.completedAttempts": completedAttempts,
      "stats.avgScore": Math.round(avgScore * 10) / 10,
      "stats.highestScore": Math.round(highestScore * 10) / 10,
      "stats.completionRate": totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
    });

    console.log(`✅ Org report enriched for interview ${interview._id}`);
  } catch (error) {
    console.error("Enrichment failed:", error.message);
  }
};

/**
 * Get report by interview ID
 */
const getReportByInterviewId = async (interviewId) => {
  return Report.findOne({ interviewId }).lean();
};

module.exports = { buildReport, getReportByInterviewId };

