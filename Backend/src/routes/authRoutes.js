const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, updateTheme, forgotPassword, verifyOtp, resetPassword } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const { registerValidation, loginValidation } = require("../middlewares/validationMiddleware");
const upload = require("../middlewares/uploadMiddleware");

// POST /api/auth/register
router.post("/register", registerValidation, register);

// POST /api/auth/login
router.post("/login", loginValidation, login);

// GET /api/auth/me  (protected)
router.get("/me", protect, getMe);

// PUT /api/auth/profile (protected) — supports multipart for resume
router.put("/profile", protect, upload.single("resume"), updateProfile);

// PUT /api/auth/theme (protected) — quick theme toggle
router.put("/theme", protect, updateTheme);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtp);

// POST /api/auth/reset-password
router.post("/reset-password", resetPassword);

module.exports = router;
