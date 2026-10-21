const { validationResult } = require("express-validator");
const Interview = require("../models/Interview");
const Report = require("../models/Report");
const User = require("../models/User");
const InterviewTemplate = require("../models/InterviewTemplate");
const Organization = require("../models/Organization");
const { generateQuestions } = require("../services/geminiService");
const { buildReport } = require("../services/reportService");

// ─── Structured Interview Order Helper ─────────────────────────────────────
/**
 * Sorts generated questions into a natural interview flow:
 * 1. Self Introduction (always first — injected)
 * 2. HR warm-up questions
 * 3. Behavioral questions
 * 4. Technical / Theory questions
 * 5. System Design
 * 6. Coding questions (always last, 1-2 max)
 */
function sortQuestionsStructured(questions, interviewType = "mixed") {
  const TYPE_ORDER = { hr: 0, behavioral: 1, theory: 2, system_design: 3, code: 4 };

  // Inject mandatory self-introduction question as first question
  const selfIntroQ = {
    questionId: "q_intro",
    question: "To start things off, tell me about yourself — your background, what you've been working on recently, and what excites you about this role.",
    questionType: "hr",
    difficulty: "easy",
    expectedAnswer: "Clear articulation of background, relevant experience, and genuine motivation for the role.",
    topic: "Self Introduction",
    status: "pending",
    answers: [],
    followupCount: 0,
    score: null,
  };

  // Remove any existing intro-style questions to avoid duplicates
  const filtered = questions.filter(
    (q) => !/(tell me about yourself|introduce yourself|walk me through your background)/i.test(q.question)
  );

  // Sort by type order
  const sorted = filtered.sort((a, b) => {
    const aOrder = TYPE_ORDER[a.questionType] ?? 2;
    const bOrder = TYPE_ORDER[b.questionType] ?? 2;
    return aOrder - bOrder;
  });

  return [selfIntroQ, ...sorted];
}


/**
 * GET /api/interviews/join/:shareCode
 * Public — returns template info for the join page (no auth required)
 */
const getTemplateInfo = async (req, res, next) => {
  try {
    const template = await InterviewTemplate.findOne({ shareCode: req.params.shareCode })
      .select("-questions")
      .lean();

    if (!template) {
      return res.status(404).json({ success: false, message: "Interview not found. Check the link." });
    }

    const org = await Organization.findById(template.organizationId)
      .select("name type logo description")
      .lean();

    // Check if deadline has passed
    if (template.deadline && new Date(template.deadline) < new Date()) {
      return res.status(410).json({
        success: false,
        message: "This interview link has expired.",
        expired: true,
      });
    }

    if (template.status === "closed") {
      return res.status(410).json({
        success: false,
        message: "This interview is no longer accepting submissions.",
        closed: true,
      });
    }

    res.json({
      success: true,
      data: {
        templateId: template._id,
        shareCode: template.shareCode,
        title: template.title,
        role: template.role,
        interviewType: template.interviewType,
        difficulty: template.difficulty,
        duration: template.duration,
        questionCount: template.questionCount,
        techStack: template.techStack,
        instructions: template.instructions,
        deadline: template.deadline,
        maxAttempts: template.maxAttempts,
        proctoringEnabled: template.proctoringEnabled,
        organization: org,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/create
 * Create a new interview and generate questions
 */
const createInterview = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      role,
      experienceLevel,
      techStack,
      questionCount = 8,
      interviewType = "mixed",
      difficulty = "adaptive",
      targetDuration = 45,
      templateId, // optional — if joining org interview
      aiEngine: reqAiEngine,
      groqApiKey: reqGroqApiKey,
    } = req.body;

    // Fetch user preferences for default AI engine & Groq key
    const currentUser = await User.findById(req.user.id).select("preferredAIEngine groqApiKey").lean();
    const activeAiEngine = reqAiEngine || currentUser?.preferredAIEngine || (process.env.GROQ_API_KEY ? "groq" : "qwen_local");
    const activeGroqApiKey = reqGroqApiKey || currentUser?.groqApiKey || process.env.GROQ_API_KEY || null;

    // ─── Template-based interview (org join flow) ─────────────────────
    if (templateId) {
      const template = await InterviewTemplate.findById(templateId).lean();
      if (!template) {
        return res.status(404).json({ success: false, message: "Interview template not found." });
      }

      if (template.status === "closed") {
        return res.status(403).json({ success: false, message: "This interview is closed." });
      }

      if (template.deadline && new Date(template.deadline) < new Date()) {
        return res.status(403).json({ success: false, message: "Interview deadline has passed." });
      }

      // Check attempt limit
      const existingAttempts = await Interview.countDocuments({
        userId: req.user.id,
        templateId,
      });

      if (existingAttempts >= template.maxAttempts) {
        return res.status(403).json({
          success: false,
          message: `You have reached the maximum of ${template.maxAttempts} attempt(s) for this interview.`,
          attemptsUsed: existingAttempts,
          maxAttempts: template.maxAttempts,
        });
      }

      // Enforce structured question ordering with mandatory self-intro as question 0
      const orderedQuestions = sortQuestionsStructured(template.questions, template.interviewType);

      // Create interview from template (copy questions)
      const interview = await Interview.create({
        userId: req.user.id,
        templateId: template._id,
        organizationId: template.organizationId,
        attemptNumber: existingAttempts + 1,
        role: template.role,
        experienceLevel: "mid",
        techStack: template.techStack,
        questions: orderedQuestions.map((q) => ({ ...q, status: "pending", answers: [] })),
        totalQuestions: orderedQuestions.length,
        interviewType: template.interviewType,
        difficulty: template.difficulty,
        targetDuration: template.duration,
        aiEngine: activeAiEngine,
        status: "created",
      });

      await User.findByIdAndUpdate(req.user.id, { $push: { interviews: interview._id } });

      return res.status(201).json({
        success: true,
        data: {
          interviewId: interview._id,
          role: interview.role,
          experienceLevel: interview.experienceLevel,
          techStack: interview.techStack,
          totalQuestions: interview.totalQuestions,
          interviewType: interview.interviewType,
          difficulty: interview.difficulty,
          targetDuration: interview.targetDuration,
          templateId: template._id,
          attemptNumber: interview.attemptNumber,
          questions: interview.questions.map((q) => ({
            questionId: q.questionId,
            question: q.question,
            questionType: q.questionType,
            difficulty: q.difficulty,
            topic: q.topic,
          })),
        },
      });
    }

    // ─── Solo interview (original flow) ──────────────────────────────
    const parsedTechStack = Array.isArray(techStack)
      ? techStack
      : techStack.split(",").map((t) => t.trim());

    // ─── Auto-compute question count from duration + difficulty ─────────
    //   Duration guidance: ~4-5 min per question (incl. follow-ups)
    //   Difficulty modifier: hard = more depth = fewer questions
    const durationMins = Math.max(10, Math.min(120, Number(targetDuration) || 45));
    let computedCount;
    if (questionCount && questionCount !== 8) {
      // User explicitly set a count — respect it
      computedCount = Math.min(Math.max(questionCount, 3), 20);
    } else {
      // Auto-calculate from duration
      const minutesPerQ = difficulty === "hard" ? 6 : difficulty === "easy" ? 3.5 : 5;
      computedCount = Math.round(durationMins / minutesPerQ);
      computedCount = Math.min(Math.max(computedCount, 3), 15);
    }

    // ─── Determine coding question count (1 for <30min, 2 for ≥30min) ──
    const codingQCount = interviewType !== "hr" && interviewType !== "behavioral"
      ? (durationMins >= 30 ? 2 : 1)
      : 0;

    // Generate questions via Groq or Local Qwen
    const generatedQuestions = await generateQuestions({
      role,
      experienceLevel,
      techStack: parsedTechStack,
      count: computedCount,
      interviewType,
      difficulty,
      codingQCount,
      aiEngine: activeAiEngine,
      groqApiKey: activeGroqApiKey,
    });

    // ─── Enforce structured question ordering ──────────────────────────
    // Order: [1 self-intro HR] → [HR questions] → [Technical/Theory] → [Coding]
    const orderedQuestions = sortQuestionsStructured(generatedQuestions, interviewType);

    // Create interview with structured question ordering
    const interview = await Interview.create({
      userId: req.user.id,
      role,
      experienceLevel,
      techStack: parsedTechStack,
      questions: orderedQuestions,
      totalQuestions: orderedQuestions.length,
      interviewType,
      difficulty,
      targetDuration,
      aiEngine: activeAiEngine,
      status: "created",
    });

    // Add to user's interview list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { interviews: interview._id },
    });

    res.status(201).json({
      success: true,
      data: {
        interviewId: interview._id,
        role: interview.role,
        experienceLevel: interview.experienceLevel,
        techStack: interview.techStack,
        totalQuestions: interview.totalQuestions,
        interviewType: interview.interviewType,
        difficulty: interview.difficulty,
        targetDuration: interview.targetDuration,
        questions: interview.questions.map((q) => ({
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
 * GET /api/interviews
 * Get all interviews for current user, with report scores joined
 */
const getMyInterviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, sort = "newest" } = req.query;
    const filter = { userId: req.user.id };
    if (status && status !== "all") filter.status = status;

    let sortQuery = { createdAt: -1 };
    if (sort === "oldest") sortQuery = { createdAt: 1 };

    const interviews = await Interview.find(filter)
      .select("role experienceLevel techStack status totalQuestions interviewType difficulty startedAt completedAt totalTimeTaken createdAt reportId")
      .sort(sortQuery)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    // Search filter (post-query)
    let filtered = interviews;
    if (search) {
      const q = search.toLowerCase();
      filtered = interviews.filter(
        (i) => i.role?.toLowerCase().includes(q) || i.techStack?.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Join report scores for completed interviews
    const reportIds = filtered
      .filter((i) => i.reportId)
      .map((i) => i.reportId);

    let reportsMap = {};
    if (reportIds.length > 0) {
      const reports = await Report.find({ _id: { $in: reportIds } })
        .select("interviewId overallScore recommendation")
        .lean();
      reports.forEach((r) => {
        reportsMap[r.interviewId.toString()] = {
          overallScore: r.overallScore,
          recommendation: r.recommendation,
        };
      });
    }

    const enriched = filtered.map((i) => ({
      ...i,
      reportData: reportsMap[i._id.toString()] || null,
    }));

    // Compute overall stats
    const completed = interviews.filter((i) => ["completed", "auto_submitted"].includes(i.status));
    const completedWithScores = completed.filter((i) => reportsMap[i._id.toString()]);
    const avgScore = completedWithScores.length > 0
      ? completedWithScores.reduce((sum, i) => sum + (reportsMap[i._id.toString()]?.overallScore || 0), 0) / completedWithScores.length
      : null;

    const total = await Interview.countDocuments(filter);

    res.json({
      success: true,
      data: enriched,
      stats: {
        total: interviews.length,
        completed: completed.length,
        avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/:id
 * Get specific interview details
 */
const getInterview = async (req, res, next) => {
  try {
    let interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!interview) {
      interview = await Interview.findById(req.params.id).lean();
    }

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    res.json({ success: true, data: interview });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/:id/transcript
 */
const getTranscript = async (req, res, next) => {
  try {
    let interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })
      .select("transcript role experienceLevel interviewType startedAt completedAt")
      .lean();

    if (!interview) {
      interview = await Interview.findById(req.params.id)
        .select("transcript role experienceLevel interviewType startedAt completedAt")
        .lean();
    }

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    res.json({
      success: true,
      data: {
        role: interview.role,
        experienceLevel: interview.experienceLevel,
        interviewType: interview.interviewType,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        transcript: interview.transcript,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/interviews/:id/submit
 * Manually submit interview
 */
const submitInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (!["active", "paused"].includes(interview.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit interview with status: ${interview.status}`,
      });
    }

    interview.status = "completed";
    interview.completedAt = new Date();
    if (interview.startedAt) {
      interview.totalTimeTaken = Math.round(
        (interview.completedAt - interview.startedAt) / 1000
      );
    }
    await interview.save();

    const report = await buildReport(interview._id);

    res.json({
      success: true,
      message: "Interview submitted successfully",
      reportId: report._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/interviews/:id
 */
const deleteInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!interview) {
      return res.status(404).json({ success: false, message: "Interview not found" });
    }

    if (interview.status === "active") {
      return res.status(400).json({ success: false, message: "Cannot delete active interview" });
    }

    await interview.deleteOne();
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { interviews: interview._id },
    });

    res.json({ success: true, message: "Interview deleted" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/interviews/prebuilt
 * Return pre-built ready-made interviews
 */
const PREBUILT_INTERVIEWS = require("../config/prebuiltInterviews");

const getPrebuiltInterviews = (req, res) => {
  const previews = PREBUILT_INTERVIEWS.map((item) => ({
    id: item.id,
    title: item.title,
    role: item.role,
    badge: item.badge,
    badgeColor: item.badgeColor,
    experienceLevel: item.experienceLevel,
    interviewType: item.interviewType,
    difficulty: item.difficulty,
    duration: item.duration,
    techStack: item.techStack,
    description: item.description,
    icon: item.icon,
    questionCount: item.questions.length,
  }));
  res.json({ success: true, data: previews });
};

/**
 * POST /api/interviews/prebuilt/:id/start
 * Instantly start a ready-made interview without generating questions
 */
const startPrebuiltInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = PREBUILT_INTERVIEWS.find((t) => t.id === id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Ready-made interview not found" });
    }

    const userId = req.user?.id || req.user?._id || "660000000000000000000001";

    // Enforce structured question ordering with mandatory self-intro as question 0
    const orderedQuestions = sortQuestionsStructured(template.questions, template.interviewType);

    const interview = await Interview.create({
      userId,
      role: template.role,
      experienceLevel: template.experienceLevel,
      techStack: template.techStack,
      questions: orderedQuestions.map((q) => ({
        ...q,
        status: "pending",
        answers: [],
        followupCount: 0,
      })),
      totalQuestions: orderedQuestions.length,
      interviewType: template.interviewType,
      difficulty: template.difficulty,
      targetDuration: template.duration,
      status: "created",
    });

    res.status(201).json({
      success: true,
      message: "Ready-made interview loaded instantly",
      data: {
        interviewId: interview._id,
        role: interview.role,
        totalQuestions: interview.totalQuestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplateInfo,
  createInterview,
  getMyInterviews,
  getInterview,
  getTranscript,
  submitInterview,
  deleteInterview,
  getPrebuiltInterviews,
  startPrebuiltInterview,
};
