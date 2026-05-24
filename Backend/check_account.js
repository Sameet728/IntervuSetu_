require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Organization = require('./src/models/Organization');

async function checkAccount() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = '202401120004@mitaoe.ac.in';
    
    let user = await User.findOne({ email });
    if (user) {
      console.log('Found as USER. ID:', user._id);
      process.exit(0);
    }

    let org = await Organization.findOne({ email });
    if (org) {
      console.log('Found as ORGANIZATION. ID:', org._id);
      process.exit(0);
    }

    console.log('Account not found!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAccount();
