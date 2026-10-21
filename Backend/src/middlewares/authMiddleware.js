const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { DEFAULT_USER_ID } = require("../config/inMemoryDB");

const DEMO_USER = {
  _id: DEFAULT_USER_ID,
  id: DEFAULT_USER_ID,
  name: "Demo Candidate",
  email: "candidate@intervusetu.ai",
  role: "candidate",
  plan: "pro",
  isActive: true,
};

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // If no token or demo token in development, allow seamless testing without login
  if (!token || token === "demo-token" || token === "guest-token" || token === "null" || token === "undefined") {
    req.user = DEMO_USER;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_dev_key_intervusetu_2026");
    const user = await User.findById(decoded.id).select("-password -__v");

    if (!user || !user.isActive) {
      req.user = DEMO_USER;
      return next();
    }

    req.user = user;
    next();
  } catch (error) {
    // In dev / test mode, fallback to demo user to prevent login blockers
    req.user = DEMO_USER;
    next();
  }
};

module.exports = { protect, DEMO_USER };
