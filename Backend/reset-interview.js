require("dotenv").config();
const mongoose = require("mongoose");

const INTERVIEW_ID = "69cd1473f8b2b1b37a295c74";

async function resetInterview() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const result = await mongoose.connection.db.collection("interviews").updateOne(
            { _id: new mongoose.Types.ObjectId(INTERVIEW_ID) },
            {
                $set: {
                    status: "created",
                    autoSubmitted: false,
                    violationCount: 0,
                    currentQuestionIndex: 0,
                    totalTimeTaken: 0,
                    longTermSummary: "",
                    transcript: [],
                    shortTermMemory: [],
                    violations: [],
                },
                $unset: {
                    startedAt: "",
                    completedAt: "",
                    reportId: "",
                },
            }
        );

        if (result.matchedCount === 0) {
            console.log("❌ Interview not found");
        } else {
            console.log("✅ Interview reset successfully");
            console.log(`   Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
        }

        await mongoose.connection.close();
        console.log("✅ Connection closed");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

resetInterview();
