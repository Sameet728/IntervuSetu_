require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initializeSocket } = require("./src/sockets/interviewSocket");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
connectDB().then(() => {
    const server = http.createServer(app);

    // Attach WebSocket server to HTTP server
    initializeSocket(server);

    server.listen(PORT, () => {
        console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
        console.log(`📡 WebSocket server ready`);
        console.log(`🗄️  MongoDB connected\n`);
    });
}).catch((err) => {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
});
