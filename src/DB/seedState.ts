const mongoose = require("mongoose");
const { SuburbDB } = require("../modules/shift/shift.model");
require("dotenv").config();
const suburbsData = [
  { state: "New South Wales", suburb: "Bondi" },
  { state: "New South Wales", suburb: "Burwood" },
  { state: "Queensland", suburb: "Sunnybank" },
  { state: "Queensland", suburb: "Paddington" },
  // Add more suburbs here
];

const runStateSeed = async (data: any) => {
  try {
    // console.log(process.env.DATABASE_URL);
    await mongoose.connect(process.env.DATABASE_URL);

    await SuburbDB.deleteMany({});
    await SuburbDB.insertMany(data);
    console.log("Suburb data seeded successfully");
  } catch (err) {
    console.error("Error seeding suburb data:", err);
  } finally {
    mongoose.disconnect();
  }
};

runStateSeed(suburbsData);
