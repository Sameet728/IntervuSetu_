const mongoose = require("mongoose");

const scheduleSlotSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InterviewTemplate",
      required: true,
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // in minutes
    isBooked: { type: Boolean, default: false },
    bookedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent double bookings on the exact same slot by the exact same user
scheduleSlotSchema.index({ startTime: 1, templateId: 1, bookedBy: 1 }, { unique: true, partialFilterExpression: { isBooked: true } });

module.exports = mongoose.model("ScheduleSlot", scheduleSlotSchema);
