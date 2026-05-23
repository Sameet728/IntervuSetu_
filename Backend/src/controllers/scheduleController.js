const ScheduleSlot = require("../models/ScheduleSlot");
const InterviewTemplate = require("../models/InterviewTemplate");
const Interview = require("../models/Interview");
const { sendEmail } = require("../services/emailService");

/**
 * ORG: Create one or multiple time slots for a given template.
 */
const createSlots = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { slots } = req.body; // Array of { startTime, duration }

    // Validate template ownership
    const template = await InterviewTemplate.findOne({ _id: templateId, organizationId: req.org._id });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found" });
    }

    const slotDocs = slots.map(slot => {
      const start = new Date(slot.startTime);
      const end = new Date(start.getTime() + slot.duration * 60000);
      return {
        organizationId: req.org._id,
        templateId,
        startTime: start,
        endTime: end,
        duration: slot.duration,
      };
    });

    const created = await ScheduleSlot.insertMany(slotDocs);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

/**
 * ORG: Get all slots for a template
 */
const getOrgSlots = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const slots = await ScheduleSlot.find({ templateId, organizationId: req.org._id })
      .populate("bookedBy", "name email")
      .sort({ startTime: 1 });
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

/**
 * ORG: Delete an unbooked slot
 */
const deleteSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const slot = await ScheduleSlot.findOne({ _id: slotId, organizationId: req.org._id });
    
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });
    if (slot.isBooked) return res.status(400).json({ success: false, message: "Cannot delete a booked slot" });

    await ScheduleSlot.findByIdAndDelete(slotId);
    res.json({ success: true, message: "Slot deleted" });
  } catch (err) {
    next(err);
  }
};

/**
 * CANDIDATE: Get available upcoming slots
 */
const getAvailableSlots = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    // Only show slots strictly in the future
    const slots = await ScheduleSlot.find({ 
      templateId, 
      isBooked: false, 
      startTime: { $gt: new Date() } 
    }).sort({ startTime: 1 });

    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

/**
 * CANDIDATE: Book a specific slot
 */
const bookSlot = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    const userId = req.user.id;

    // Concurrency control using findOneAndUpdate to atomically book
    const slot = await ScheduleSlot.findOneAndUpdate(
      { _id: slotId, isBooked: false, startTime: { $gt: new Date() } },
      { $set: { isBooked: true, bookedBy: userId } },
      { new: true }
    ).populate("templateId");

    if (!slot) {
      return res.status(400).json({ success: false, message: "Slot is unavailable or already booked" });
    }

    res.json({ success: true, message: "Slot booked successfully", data: slot });
  } catch (err) {
    if (err.code === 11000) {
      // Index unique constraint fail
      return res.status(400).json({ success: false, message: "You have already booked a slot for this time." });
    }
    next(err);
  }
};

/**
 * CANDIDATE: Get my upcoming interviews
 */
const getMyUpcomingInterviews = async (req, res, next) => {
  try {
    const slots = await ScheduleSlot.find({ bookedBy: req.user.id })
      .populate("templateId", "title role companyName duration")
      .sort({ startTime: 1 });
      
    res.json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSlots,
  getOrgSlots,
  deleteSlot,
  getAvailableSlots,
  bookSlot,
  getMyUpcomingInterviews
};
