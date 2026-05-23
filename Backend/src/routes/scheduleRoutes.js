const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const { protectOrg } = require("../middlewares/orgAuthMiddleware");
const { 
  createSlots, getOrgSlots, deleteSlot, 
  getAvailableSlots, bookSlot, getMyUpcomingInterviews 
} = require("../controllers/scheduleController");

// --- Candidate Routes ---
// GET /api/schedule/candidate/my-interviews
router.get("/candidate/my-interviews", protect, getMyUpcomingInterviews);

// GET /api/schedule/candidate/available/:templateId
router.get("/candidate/available/:templateId", protect, getAvailableSlots);

// POST /api/schedule/candidate/book/:slotId
router.post("/candidate/book/:slotId", protect, bookSlot);

// --- Organization Routes ---
// POST /api/schedule/org/template/:templateId
router.post("/org/template/:templateId", protectOrg, createSlots);

// GET /api/schedule/org/template/:templateId
router.get("/org/template/:templateId", protectOrg, getOrgSlots);

// DELETE /api/schedule/org/slot/:slotId
router.delete("/org/slot/:slotId", protectOrg, deleteSlot);


module.exports = router;
