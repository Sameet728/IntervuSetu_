const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["college", "company"],
      required: [true, "Organization type is required"],
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
    logo: {
      type: String,
      default: "", // Cloudinary URL
    },
    logoPublicId: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    website: {
      type: String,
      default: "",
    },
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
    // Password Reset
    resetPasswordOtp: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
organizationSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

organizationSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Organization", organizationSchema);
