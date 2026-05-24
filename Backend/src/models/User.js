const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    // ─── Extended Profile ──────────────────────────────────────────
    phone: { type: String, trim: true, default: "" },
    profilePicture: { type: String, default: "" },

    // Student vs Professional
    userType: {
      type: String,
      enum: ["student", "professional"],
      default: "professional",
    },

    // Plan & Roles
    plan: {
      type: String,
      enum: ["free", "pro"],
      default: "free",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // Student-specific
    college: { type: String, trim: true, default: "" },
    year: {
      type: String,
      enum: ["FE", "SE", "TE", "BE", ""],
      default: "",
    },
    branch: { type: String, trim: true, default: "" },

    // Professional-specific
    company: { type: String, trim: true, default: "" },
    yearsOfExperience: { type: Number, default: 0 },

    // Common
    skills: [{ type: String, trim: true }],
    targetRole: { type: String, trim: true, default: "" },
    experienceLevel: {
      type: String,
      enum: ["fresher", "junior", "mid", "senior", "lead", ""],
      default: "",
    },

    // Resume
    resumeUrl: { type: String, default: "" },        // local path or future S3 URL
    resumeOriginalName: { type: String, default: "" },
    resumeText: { type: String, default: "" },       // extracted text from pdf-parse
    resumeUploadedAt: { type: Date },

    // Settings
    preferredTheme: {
      type: String,
      enum: ["dark", "light", "system"],
      default: "system",
    },

    // Password Reset
    resetPasswordOtp: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    interviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Interview",
      },
    ],
    
    // Transactions
    transactions: [
      {
        orderId: String,
        paymentId: String,
        amount: Number,
        currency: String,
        status: String,
        date: { type: Date, default: Date.now },
      }
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
    
    // Email Verification
    isVerified: {
      type: Boolean,
      default: false,
    },
    signupOtp: {
      type: String,
      select: false,
    },
    signupOtpExpire: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
