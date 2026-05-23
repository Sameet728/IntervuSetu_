const express = require("express");
const router = express.Router();
const { register, login, getMe, updateProfile, forgotPassword, verifyOtp, resetPassword, verifySignupOtp } = require("../controllers/orgAuthController");
const { protectOrg } = require("../middlewares/orgAuthMiddleware");
const uploadLogo = require("../middlewares/cloudinaryUpload");

// POST /api/org/auth/register
router.post("/register", uploadLogo.single("logo"), register);

// POST /api/org/auth/verify-signup
router.post("/verify-signup", verifySignupOtp);

// POST /api/org/auth/login
router.post("/login", login);

// GET /api/org/auth/me (protected)
router.get("/me", protectOrg, getMe);

// PUT /api/org/auth/profile (protected)
router.put("/profile", protectOrg, uploadLogo.single("logo"), updateProfile);

// POST /api/org/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/org/auth/verify-otp
router.post("/verify-otp", verifyOtp);

// POST /api/org/auth/reset-password
router.post("/reset-password", resetPassword);

module.exports = router;
