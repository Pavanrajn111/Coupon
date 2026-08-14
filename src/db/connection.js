const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI?.trim();
    if (uri) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return;
      } catch (error) {
        console.warn(
          "Primary MongoDB connection failed, falling back to in-memory database.",
          error.message,
        );
      }
    }

    if (!mongoServer) {
      mongoServer = await MongoMemoryServer.create();
    }

    const memoryUri = mongoServer.getUri();
    const conn = await mongoose.connect(memoryUri, { dbName: "couponex" });
    console.log(`MongoDB Connected (in-memory): ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
