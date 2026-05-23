require("dotenv").config();
const mongoose = require("mongoose");

const REPORT_ID = "69cd1edda0fa2b10ea6be4f3";

async function deleteReport() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const result = await mongoose.connection.db.collection("reports").deleteOne(
            { _id: new mongoose.Types.ObjectId(REPORT_ID) }
        );

        if (result.deletedCount === 0) {
            console.log("⚠️  Report not found or already deleted");
        } else {
            console.log("✅ Report deleted successfully");
        }

        await mongoose.connection.close();
        console.log("✅ Connection closed");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

deleteReport();
