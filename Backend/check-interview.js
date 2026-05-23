require("dotenv").config();
const mongoose = require("mongoose");

const INTERVIEW_ID = "69cd1473f8b2b1b37a295c74";

async function checkInterview() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const interview = await mongoose.connection.db.collection("interviews").findOne(
            { _id: new mongoose.Types.ObjectId(INTERVIEW_ID) }
        );

        if (!interview) {
            console.log("❌ Interview not found");
        } else {
            console.log("📋 Interview Status:");
            console.log("   Status:", interview.status);
            console.log("   Auto-submitted:", interview.autoSubmitted);
            console.log("   Violation count:", interview.violationCount);
            console.log("   Current question:", interview.currentQuestionIndex);
            console.log("   Total time:", interview.totalTimeTaken);
            console.log("   Started at:", interview.startedAt);
            console.log("   Completed at:", interview.completedAt);
            console.log("   Report ID:", interview.reportId);
            console.log("   Transcript length:", interview.transcript?.length || 0);
            console.log("   Violations length:", interview.violations?.length || 0);
        }

        await mongoose.connection.close();
        console.log("✅ Connection closed");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

checkInterview();
