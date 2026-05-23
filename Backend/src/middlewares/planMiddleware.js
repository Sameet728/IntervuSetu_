const User = require("../models/User");

const checkUserPlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Pro users have no restrictions
    if (user.plan === "pro" || user.role === "admin") {
      return next();
    }

    // FREE PLAN RESTRICTIONS
    const { difficulty, targetDuration, questionCount } = req.body;

    // 1. Max 3 interviews total
    if (user.interviews && user.interviews.length >= 3) {
      return res.status(403).json({
        success: false,
        message: "Free plan limit reached: Maximum 3 interviews allowed. Please upgrade to Pro.",
        requiresUpgrade: true,
      });
    }

    // 2. Difficulty limits
    if (difficulty === "hard" || difficulty === "adaptive") {
      return res.status(403).json({
        success: false,
        message: "Hard and Adaptive difficulties are available only in the Pro plan.",
        requiresUpgrade: true,
      });
    }

    // 3. Duration limits
    if (targetDuration > 30) {
      return res.status(403).json({
        success: false,
        message: "Free plan is limited to maximum 30 minutes per interview.",
        requiresUpgrade: true,
      });
    }

    // 4. Question Count limits
    if (questionCount > 5) {
      return res.status(403).json({
        success: false,
        message: "Free plan is limited to maximum 5 questions per interview.",
        requiresUpgrade: true,
      });
    }

    next();
  } catch (error) {
    console.error("Plan check error:", error);
    res.status(500).json({ success: false, message: "Server error checking user plan" });
  }
};

module.exports = { checkUserPlan };
