const { MongoClient } = require("mongodb");
require('dotenv').config();

// MongoDB connection URI - use environment variable or default
const uri = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.rzbfab5.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri);

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("talenttrack");
    console.log("✅ Connected to MongoDB Atlas");
    
    // Create indexes for better query performance
    await db.collection("workout_sessions").createIndex({ athleteName: 1, timestamp: -1 });
    await db.collection("rep_images").createIndex({ sessionId: 1 });
    
    console.log("✅ Database indexes created");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Please update your MongoDB credentials in server/.env");
    throw err;
  }
}

function getDB() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

module.exports = { connectDB, getDB, closeDB };
