require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

    const email = "admin@interviewai.app";
    const password = "Admin@123!";

    let admin = await User.findOne({ email });

    if (!admin) {
      admin = new User({
        name: "Super Admin",
        email: email,
        password: password,
        role: "admin",
        isVerified: true
      });
      await admin.save();
      console.log("Admin account created successfully!");
    } else {
      // Update password and role if it already exists
      admin.password = password;
      admin.role = "admin";
      admin.isVerified = true;
      await admin.save();
      console.log("Admin account updated successfully!");
    }

    console.log(`
---------------------------------
Credentials:
Email:    ${email}
Password: ${password}
Role:     Admin
Verified: True
---------------------------------
    `);

    process.exit(0);
  } catch (error) {
    console.error("Error creating admin account:", error);
    process.exit(1);
  }
};

createAdmin();
