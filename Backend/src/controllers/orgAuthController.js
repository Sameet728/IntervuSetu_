const jwt = require("jsonwebtoken");
const Organization = require("../models/Organization");
const cloudinary = require("../config/cloudinary");
const bcrypt = require("bcryptjs");
const { sendOtpEmail } = require("../services/emailService");

const signToken = (orgId) =>
  jwt.sign({ orgId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

/**
 * POST /api/org/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, type, description, website } = req.body;

    if (!name || !email || !password || !type) {
      return res.status(400).json({ success: false, message: "name, email, password, and type are required." });
    }
    if (!["college", "company"].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be college or company." });
    }

    const existing = await Organization.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: "An organization with this email already exists." });
    }

    const orgData = { name, email, password, type, description, website };

    // Logo upload via Cloudinary (if file was sent)
    if (req.file) {
      orgData.logo = req.file.path; // Cloudinary URL
      orgData.logoPublicId = req.file.filename;
    }

    const org = await Organization.create(orgData);
    const token = signToken(org._id);

    res.status(201).json({
      success: true,
      token,
      data: {
        id: org._id,
        name: org.name,
        email: org.email,
        type: org.type,
        logo: org.logo,
        description: org.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/org/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const org = await Organization.findOne({ email }).select("+password");
    if (!org || !org.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const isMatch = await org.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const token = signToken(org._id);

    res.json({
      success: true,
      token,
      data: {
        id: org._id,
        name: org.name,
        email: org.email,
        type: org.type,
        logo: org.logo,
        description: org.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/org/auth/me
 */
const getMe = async (req, res) => {
  res.json({ success: true, data: req.org });
};

/**
 * PUT /api/org/auth/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, description, website } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (website !== undefined) updates.website = website;

    if (req.file) {
      // Delete old logo if it exists
      if (req.org.logoPublicId) {
        await cloudinary.uploader.destroy(req.org.logoPublicId).catch(() => {});
      }
      updates.logo = req.file.path;
      updates.logoPublicId = req.file.filename;
    }

    const updated = await Organization.findByIdAndUpdate(req.org._id, updates, { new: true });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/org/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const org = await Organization.findOne({ email });
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    org.resetPasswordOtp = hashedOtp;
    org.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await org.save();

    await sendOtpEmail({ to: org.email, name: org.name, otp });
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/org/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const org = await Organization.findOne({ 
      email,
      resetPasswordExpire: { $gt: Date.now() }
    }).select("+resetPasswordOtp");

    if (!org) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const isMatch = await bcrypt.compare(otp.toString(), org.resetPasswordOtp);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid OTP" });

    const resetToken = jwt.sign({ id: org._id, type: "org_password_reset" }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.json({ success: true, resetToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/org/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.type !== "org_password_reset") {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    const org = await Organization.findById(decoded.id);
    if (!org) return res.status(404).json({ success: false, message: "Organization not found" });

    org.password = newPassword;
    org.resetPasswordOtp = undefined;
    org.resetPasswordExpire = undefined;
    await org.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, message: "Reset session expired" });
    }
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, forgotPassword, verifyOtp, resetPassword };
