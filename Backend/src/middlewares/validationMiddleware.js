const { body } = require("express-validator");

const registerValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 50 }).withMessage("Name must be 2–50 characters"),
  body("email")
    .trim()
    .isEmail().withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const createInterviewValidation = [
  body("role")
    .trim()
    .notEmpty().withMessage("Role is required")
    .isLength({ max: 100 }).withMessage("Role must be under 100 characters"),
  body("experienceLevel")
    .isIn(["fresher", "junior", "mid", "senior", "lead"])
    .withMessage("Experience level must be: fresher, junior, mid, senior, or lead"),
  body("techStack")
    .notEmpty().withMessage("Tech stack is required"),
  body("questionCount")
    .optional()
    .isInt({ min: 3, max: 20 }).withMessage("Question count must be between 3 and 20"),
  body("interviewType")
    .optional()
    .isIn(["technical", "hr", "behavioral", "system_design", "mixed"])
    .withMessage("Invalid interview type"),
  body("difficulty")
    .optional()
    .isIn(["easy", "medium", "hard", "adaptive"])
    .withMessage("Invalid difficulty"),
  body("targetDuration")
    .optional()
    .isInt({ min: 10, max: 180 })
    .withMessage("Duration must be 10–180 minutes"),
];

module.exports = { registerValidation, loginValidation, createInterviewValidation };
