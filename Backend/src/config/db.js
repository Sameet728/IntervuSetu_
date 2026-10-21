const mongoose = require("mongoose");
const { patchMongooseModel } = require("./inMemoryDB");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (uri) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.warn(`⚠️ MongoDB connection failed (${error.message}).`);
    }
  }

  // Graceful fallback to zero-database in-memory mode
  console.log(`🚀 Activating In-Memory Database Mode — no external MongoDB needed!`);

  // Patch each model with in-memory operations
  const models = [
    { name: "Interview", model: require("../models/Interview") },
    { name: "User", model: require("../models/User") },
    { name: "Report", model: require("../models/Report") },
    { name: "InterviewTemplate", model: require("../models/InterviewTemplate") },
    { name: "Organization", model: require("../models/Organization") },
    { name: "AptitudeAttempt", model: require("../models/AptitudeAttempt") },
    { name: "AptitudeQuestion", model: require("../models/AptitudeQuestion") },
    { name: "AptitudeTest", model: require("../models/AptitudeTest") },
    { name: "ScheduleSlot", model: require("../models/ScheduleSlot") },
  ];

  for (const { name, model } of models) {
    patchMongooseModel(model, name);
  }

  console.log(`✅ All models patched with in-memory storage.`);
};

module.exports = connectDB;
