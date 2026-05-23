const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");

const protectOrg = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Must be an org token (has orgId, not id)
    if (!decoded.orgId) {
      return res.status(401).json({ success: false, message: "Invalid token type." });
    }

    const org = await Organization.findById(decoded.orgId).select("-password -__v");
    if (!org || !org.isActive) {
      return res.status(401).json({ success: false, message: "Organization not found or deactivated." });
    }

    req.org = org;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

module.exports = { protectOrg };
