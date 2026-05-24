require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./src/models/Organization');

async function findOrg() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const orgs = await Organization.find();
    console.log("Organizations:", orgs.map(o => ({ id: o._id, name: o.name, email: o.email })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
findOrg();
