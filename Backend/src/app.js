const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const reportRoutes = require("./routes/reportRoutes");
const orgAuthRoutes = require("./routes/orgAuthRoutes");
const orgInterviewRoutes = require("./routes/orgInterviewRoutes");
const orgCandidateRoutes = require("./routes/orgCandidateRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const orgAptitudeRoutes = require("./routes/orgAptitudeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const aptitudeRoutes = require("./routes/aptitudeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contactRoutes = require("./routes/contactRoutes");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware");

const app = express();

// ─── Security Middleware ────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow static file serving
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    // In dev, allow all localhost + CLIENT_URL
    const allowed = [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:4000",
    ].filter(Boolean);
    if (allowed.includes(origin) || process.env.NODE_ENV === "development") {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ─── Rate Limiting ──────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, message: "Too many requests. Try again later." },
});
app.use("/api/auth", limiter);
app.use("/api/org/auth", limiter);

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (resume uploads) ──────────────────────────────────
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Logging ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// ─── Health Check ───────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ─── API Routes ─────────────────────────────────────────────────────
const apiRouter = express.Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/interviews", interviewRoutes);
apiRouter.use("/reports", reportRoutes);
apiRouter.use("/payment", paymentRoutes);
apiRouter.use("/aptitude", aptitudeRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/contact", contactRoutes);

// Org routes
apiRouter.use("/org/auth", orgAuthRoutes);
apiRouter.use("/org/interviews", orgInterviewRoutes);
apiRouter.use("/org/candidates", orgCandidateRoutes);
apiRouter.use("/org/aptitude", orgAptitudeRoutes);

// Scheduling routes
apiRouter.use("/schedule", scheduleRoutes);

// Mount on both /api and root to support different frontend configs
app.use("/api", apiRouter);
app.use("/", apiRouter);

// ─── Error Handlers ─────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;

