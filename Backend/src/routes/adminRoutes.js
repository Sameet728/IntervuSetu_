const express = require("express");
const router = express.Router();
const { addQuestion, getQuestions, deleteQuestion, bulkUpload } = require("../controllers/adminController");
const { protect } = require("../middlewares/authMiddleware");

// Admin authorization middleware
const adminCheck = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin access required" });
  }
};

router.use(protect);
router.use(adminCheck);

router.post("/questions", addQuestion);
router.get("/questions", getQuestions);
router.delete("/questions/:id", deleteQuestion);
router.post("/questions/bulk", bulkUpload);

module.exports = router;
