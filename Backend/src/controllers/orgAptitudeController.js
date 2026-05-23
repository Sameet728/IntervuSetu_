const AptitudeTest = require("../models/AptitudeTest");
const AptitudeAttempt = require("../models/AptitudeAttempt");
const crypto = require("crypto");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── CREATE TEST ──────────────────────────────────────────────────────────────
const createTest = async (req, res, next) => {
  try {
    const {
      title, description, instructions,
      duration, questionCount,
      difficultyMix, categories,
      deadline, maxAttempts, proctoringEnabled,
    } = req.body;

    const shareCode = crypto.randomBytes(5).toString("hex");

    const test = await AptitudeTest.create({
      organizationId: req.org.id,
      title,
      description,
      instructions,
      duration: duration || Math.ceil(questionCount * 1.3),
      questionCount: questionCount || 20,
      difficultyMix: difficultyMix || { easy: 30, medium: 50, hard: 20 },
      categories: categories?.length ? categories : ["numerical", "verbal", "logical", "situational"],
      shareCode,
      deadline: deadline || null,
      maxAttempts: maxAttempts || 1,
      proctoringEnabled: proctoringEnabled !== false,
      status: "active",
    });

    const joinUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/aptitude/join/${shareCode}`;

    res.status(201).json({ success: true, data: { ...test.toObject(), joinUrl } });
  } catch (error) {
    next(error);
  }
};

// ─── GET ALL TESTS (for org) ──────────────────────────────────────────────────
const getTests = async (req, res, next) => {
  try {
    const tests = await AptitudeTest.find({ organizationId: req.org.id }).sort({ createdAt: -1 });

    // Attach attempt counts
    const withStats = await Promise.all(
      tests.map(async (t) => {
        const [total, completed] = await Promise.all([
          AptitudeAttempt.countDocuments({ testId: t._id }),
          AptitudeAttempt.countDocuments({ testId: t._id, status: { $in: ["completed", "auto_submitted"] } }),
        ]);
        const avgAcc = await AptitudeAttempt.aggregate([
          { $match: { testId: t._id, status: { $in: ["completed", "auto_submitted"] } } },
          { $group: { _id: null, avg: { $avg: "$accuracy" } } },
        ]);
        return {
          ...t.toObject(),
          stats: {
            totalAttempts: total,
            completedAttempts: completed,
            avgAccuracy: avgAcc[0]?.avg ? Math.round(avgAcc[0].avg) : null,
          },
        };
      })
    );

    res.json({ success: true, data: withStats });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE TEST (public by shareCode) ────────────────────────────────────
const getTestByShareCode = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findOne({ shareCode: req.params.shareCode, status: "active" })
      .populate("organizationId", "name logo");

    if (!test) return res.status(404).json({ success: false, message: "Test not found or closed" });

    if (test.deadline && new Date(test.deadline) < new Date()) {
      return res.status(410).json({ success: false, message: "This test deadline has passed" });
    }

    res.json({
      success: true,
      data: {
        _id: test._id,
        title: test.title,
        description: test.description,
        instructions: test.instructions,
        duration: test.duration,
        questionCount: test.questionCount,
        categories: test.categories,
        deadline: test.deadline,
        proctoringEnabled: test.proctoringEnabled,
        organization: test.organizationId,
        shareCode: test.shareCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CLOSE TEST ───────────────────────────────────────────────────────────────
const closeTest = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findOneAndUpdate(
      { _id: req.params.testId, organizationId: req.org.id },
      { status: "closed", isActive: false },
      { new: true }
    );
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    res.json({ success: true, data: test });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE TEST ──────────────────────────────────────────────────────────────
const deleteTest = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findOneAndDelete({ _id: req.params.testId, organizationId: req.org.id });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });
    await AptitudeAttempt.deleteMany({ testId: req.params.testId });
    res.json({ success: true, message: "Test and all attempts deleted" });
  } catch (error) {
    next(error);
  }
};

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────
const getLeaderboard = async (req, res, next) => {
  try {
    const { search = "", scoreMin, scoreMax, status } = req.query;

    // Verify org owns test
    const test = await AptitudeTest.findOne({ _id: req.params.testId, organizationId: req.org.id });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    let attempts = await AptitudeAttempt.find({ testId: req.params.testId, status: { $in: ["completed", "auto_submitted"] } })
      .populate("userId", "name email college company profilePicture")
      .sort({ accuracy: -1, totalScore: -1, timeTaken: 1 })
      .lean();

    // Apply filters
    if (search) {
      attempts = attempts.filter((a) =>
        a.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.userId?.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (scoreMin !== undefined) attempts = attempts.filter((a) => a.accuracy >= Number(scoreMin));
    if (scoreMax !== undefined) attempts = attempts.filter((a) => a.accuracy <= Number(scoreMax));
    if (status && status !== "all") attempts = attempts.filter((a) => a.candidateStatus === status);

    const ranked = attempts.map((a, idx) => ({
      attemptId: a._id,
      rank: idx + 1,
      candidateName: a.userId?.name || a.guestEmail || "Unknown",
      email: a.userId?.email,
      college: a.userId?.college,
      company: a.userId?.company,
      profilePicture: a.userId?.profilePicture,
      totalScore: a.totalScore,
      accuracy: Math.round(a.accuracy),
      categoryScores: a.categoryScores,
      timeTaken: a.timeTaken,
      violations: a.violations?.length || 0,
      status: a.status,
      candidateStatus: a.candidateStatus || "pending",
      completedAt: a.completedAt,
    }));

    res.json({ success: true, test, data: ranked });
  } catch (error) {
    next(error);
  }
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findOne({ _id: req.params.testId, organizationId: req.org.id });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const attempts = await AptitudeAttempt.find({ testId: req.params.testId }).lean();
    const completed = attempts.filter((a) => ["completed", "auto_submitted"].includes(a.status));

    const totalAttempts = attempts.length;
    const completedAttempts = completed.length;
    const completionRate = totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0;
    const avgAccuracy = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + a.accuracy, 0) / completed.length) : 0;
    const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + a.totalScore, 0) / completed.length * 10) / 10 : 0;

    // Score distribution buckets
    const scoreDist = { "0-25": 0, "26-50": 0, "51-75": 0, "76-100": 0 };
    completed.forEach((a) => {
      const acc = a.accuracy || 0;
      if (acc <= 25) scoreDist["0-25"]++;
      else if (acc <= 50) scoreDist["26-50"]++;
      else if (acc <= 75) scoreDist["51-75"]++;
      else scoreDist["76-100"]++;
    });

    // Category heatmap
    const catKeys = ["numerical", "verbal", "logical", "situational"];
    const categoryHeatmap = {};
    catKeys.forEach((cat) => {
      const catAttempts = completed.filter((a) => a.categoryScores?.[cat]?.total > 0);
      if (catAttempts.length > 0) {
        const avg = catAttempts.reduce((sum, a) => {
          const s = a.categoryScores[cat];
          return sum + (s.total > 0 ? (s.score / s.total) * 100 : 0);
        }, 0) / catAttempts.length;
        categoryHeatmap[cat] = Math.round(avg);
      }
    });

    // Status distribution
    const statusDist = { pending: 0, shortlisted: 0, selected: 0, rejected: 0 };
    completed.forEach((a) => { if (statusDist[a.candidateStatus] !== undefined) statusDist[a.candidateStatus]++; });

    res.json({
      success: true,
      data: {
        totalAttempts,
        completedAttempts,
        completionRate,
        avgAccuracy,
        avgScore,
        scoreDist,
        categoryHeatmap,
        statusDist,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE CANDIDATE STATUS ──────────────────────────────────────────────────
const updateCandidateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const attempt = await AptitudeAttempt.findByIdAndUpdate(
      req.params.attemptId,
      { candidateStatus: status },
      { new: true }
    );
    if (!attempt) return res.status(404).json({ success: false, message: "Attempt not found" });
    res.json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};

// ─── SEND INVITES ─────────────────────────────────────────────────────────────
const sendInvite = async (req, res, next) => {
  try {
    const { emails } = req.body;
    const test = await AptitudeTest.findOne({ _id: req.params.testId, organizationId: req.org.id })
      .populate("organizationId", "name");
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const joinUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/aptitude/join/${test.shareCode}`;
    let sent = 0;

    for (const email of emails) {
      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM || "noreply@interviewai.app",
          to: email,
          subject: `You're invited: ${test.title}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;">
              <h2>Aptitude Test Invitation</h2>
              <p>You have been invited to take the <strong>${test.title}</strong> aptitude test.</p>
              <p><strong>Duration:</strong> ${test.duration} minutes &nbsp;|&nbsp; <strong>Questions:</strong> ${test.questionCount}</p>
              ${test.deadline ? `<p><strong>Deadline:</strong> ${new Date(test.deadline).toLocaleDateString()}</p>` : ""}
              <a href="${joinUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#6d28d9;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Take the Test →</a>
            </div>
          `,
        });
        sent++;
      } catch (_) {}
    }

    res.json({ success: true, data: { sent, total: emails.length } });
  } catch (error) {
    next(error);
  }
};

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
const exportCSV = async (req, res, next) => {
  try {
    const test = await AptitudeTest.findOne({ _id: req.params.testId, organizationId: req.org.id });
    if (!test) return res.status(404).json({ success: false, message: "Test not found" });

    const attempts = await AptitudeAttempt.find({ testId: req.params.testId, status: { $in: ["completed", "auto_submitted"] } })
      .populate("userId", "name email college company")
      .sort({ accuracy: -1 })
      .lean();

    const rows = [
      ["Rank", "Name", "Email", "College/Company", "Score", "Accuracy%", "Numerical%", "Verbal%", "Logical%", "Situational%", "Time(s)", "Violations", "Status"],
      ...attempts.map((a, i) => {
        const cs = a.categoryScores || {};
        const pct = (k) => cs[k]?.total > 0 ? Math.round((cs[k].score / cs[k].total) * 100) : "";
        return [
          i + 1, a.userId?.name || "", a.userId?.email || "", a.userId?.college || a.userId?.company || "",
          a.totalScore, Math.round(a.accuracy), pct("numerical"), pct("verbal"), pct("logical"), pct("situational"),
          a.timeTaken || "", a.violations?.length || 0, a.candidateStatus || "pending",
        ];
      }),
    ];

    const csv = rows.map((r) => r.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="aptitude_${test.shareCode}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTest, getTests, getTestByShareCode,
  closeTest, deleteTest,
  getLeaderboard, getAnalytics,
  updateCandidateStatus, sendInvite, exportCSV,
};
