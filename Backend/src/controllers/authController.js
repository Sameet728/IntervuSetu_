const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sendOtpEmail, sendSignupOtpEmail, sendWelcomeEmail } = require("../services/emailService");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user && user.isVerified) {
      return res.status(409).json({ success: false, message: "Email already registered and verified." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    if (!user) {
      user = await User.create({ 
        name, 
        email, 
        password,
        signupOtp: hashedOtp,
        signupOtpExpire: Date.now() + 15 * 60 * 1000,
        isVerified: false 
      });
    } else {
      user.name = name;
      user.password = password;
      user.signupOtp = hashedOtp;
      user.signupOtpExpire = Date.now() + 15 * 60 * 1000;
      await user.save();
    }

    // Log OTP to console to help with local development when Resend is unverified
    console.log(`[DEVELOPMENT] Signup OTP for ${email}: ${otp}`);

    await sendSignupOtpEmail({ to: user.email, name: user.name, otp });

    res.status(201).json({
      success: true,
      message: "OTP sent to email. Please verify to complete registration.",
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-signup
 */
const verifySignupOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email,
      signupOtpExpire: { $gt: Date.now() }
    }).select("+signupOtp");

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    if (user.isVerified) return res.status(400).json({ success: false, message: "User is already verified" });

    const isMatch = await bcrypt.compare(otp.toString(), user.signupOtp);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.isVerified = true;
    user.signupOtp = undefined;
    user.signupOtpExpire = undefined;
    await user.save();

    await sendWelcomeEmail({ to: user.email, name: user.name });

    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        preferredTheme: user.preferredTheme,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in. You can register again to receive a new OTP." });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        preferredTheme: user.preferredTheme,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-__v -password");
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update user profile fields
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      "name", "phone", "userType", "college", "year", "branch",
      "company", "yearsOfExperience", "skills", "targetRole",
      "experienceLevel", "preferredTheme",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle resume file upload (if multer set it)
    if (req.file) {
      updates.resumeUrl = `/uploads/resumes/${req.file.filename}`;
      updates.resumeOriginalName = req.file.originalname;
      updates.resumeUploadedAt = new Date();
      
      try {
        const fs = require("fs");
        const pdfParse = require("pdf-parse");
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        // Take up to 3000 chars to avoid prompt bloat
        updates.resumeText = data.text ? data.text.substring(0, 3000).trim() : "";
      } catch (err) {
        console.error("PDF parsing failed:", err.message);
        updates.resumeText = "";
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-__v -password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/theme
 * Quick theme update (no file upload needed)
 */
const updateTheme = async (req, res, next) => {
  try {
    const { theme } = req.body;
    if (!["dark", "light", "system"].includes(theme)) {
      return res.status(400).json({ success: false, message: "Invalid theme" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { preferredTheme: theme },
      { new: true, runValidators: true }
    ).select("preferredTheme");
    res.json({ success: true, theme: user.preferredTheme });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    // Log OTP to console to help with local development when Resend is unverified
    console.log(`[DEVELOPMENT] Forgot Password OTP for ${email}: ${otp}`);

    await sendOtpEmail({ to: user.email, name: user.name, otp });
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email,
      resetPasswordExpire: { $gt: Date.now() }
    }).select("+resetPasswordOtp");

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const isMatch = await bcrypt.compare(otp.toString(), user.resetPasswordOtp);
    if (!isMatch) return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Issue a short-lived reset token (JWT)
    const resetToken = jwt.sign({ id: user._id, type: "password_reset" }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.json({ success: true, resetToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    // Verify token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (decoded.type !== "password_reset") {
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, message: "Reset session expired" });
    }
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, updateTheme, forgotPassword, verifyOtp, resetPassword, verifySignupOtp };
