const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { ObjectId } = require("mongodb");

// POST /api/sessions/add - Save workout session with rep images
router.post("/add", async (req, res) => {
  try {
    const db = getDB();
    const { sessionMeta, repImages } = req.body;

    console.log('💾 Saving workout session:', sessionMeta.athleteName, sessionMeta.activityName);

    // Insert session metadata
    const sessionResult = await db.collection("workout_sessions").insertOne({
      ...sessionMeta,
      timestamp: new Date(sessionMeta.timestamp),
      createdAt: new Date()
    });

    console.log('✅ Session saved with ID:', sessionResult.insertedId);

    // Insert all reps with sessionId
    if (repImages && repImages.length > 0) {
      const repsWithSession = repImages.map(rep => ({
        ...rep,
        sessionId: sessionResult.insertedId.toString()
      }));

      await db.collection("rep_images").insertMany(repsWithSession);
      console.log(`✅ Saved ${repImages.length} rep images`);
    }

    res.status(200).json({
      success: true,
      sessionId: sessionResult.insertedId.toString(),
      message: 'Session and reps saved successfully!'
    });

  } catch (err) {
    console.error('❌ Error saving workout:', err);
    res.status(500).json({
      success: false,
      error: 'Error saving workout data',
      details: err.message
    });
  }
});

// GET /api/sessions/athlete/:athleteName - Get all workouts for an athlete
router.get("/athlete/:athleteName", async (req, res) => {
  try {
    const db = getDB();
    const { athleteName } = req.params;

    console.log('📊 Fetching workouts for:', athleteName);

    const workouts = await db.collection("workout_sessions")
      .find({ athleteName })
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`✅ Found ${workouts.length} workouts`);

    res.status(200).json({
      success: true,
      workouts,
      count: workouts.length
    });

  } catch (err) {
    console.error('❌ Error fetching workouts:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching workouts',
      details: err.message
    });
  }
});

// GET /api/sessions/all-athletes - Get all athletes with workout counts
router.get("/all-athletes", async (req, res) => {
  try {
    const db = getDB();

    console.log('👥 Fetching all athletes...');

    const athletes = await db.collection("workout_sessions").aggregate([
      {
        $group: {
          _id: "$athleteName",
          workoutCount: { $sum: 1 },
          lastWorkout: { $max: "$timestamp" },
          athleteProfilePic: { $first: "$athleteProfilePic" }
        }
      },
      {
        $project: {
          _id: 0,
          name: "$_id",
          workoutCount: 1,
          lastWorkout: 1,
          athleteProfilePic: 1
        }
      },
      {
        $sort: { lastWorkout: -1 }
      }
    ]).toArray();

    console.log(`✅ Found ${athletes.length} athletes`);

    res.status(200).json({
      success: true,
      athletes,
      count: athletes.length
    });

  } catch (err) {
    console.error('❌ Error fetching athletes:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching athletes',
      details: err.message
    });
  }
});

// GET /api/sessions/:sessionId/reps - Get rep images for a specific workout session
router.get("/:sessionId/reps", async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.params;

    console.log('🖼️ Fetching rep images for session:', sessionId);

    const reps = await db.collection("rep_images")
      .find({ sessionId })
      .sort({ repNumber: 1 })
      .toArray();

    console.log(`✅ Found ${reps.length} rep images`);

    res.status(200).json({
      success: true,
      reps,
      count: reps.length
    });

  } catch (err) {
    console.error('❌ Error fetching rep images:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching rep images',
      details: err.message
    });
  }
});

// DELETE /api/sessions/:sessionId - Delete a workout session
router.delete("/:sessionId", async (req, res) => {
  try {
    const db = getDB();
    const { sessionId } = req.params;

    console.log('🗑️ Deleting workout session:', sessionId);

    // Delete rep images first
    await db.collection("rep_images").deleteMany({ sessionId });

    // Delete session
    await db.collection("workout_sessions").deleteOne({ _id: new ObjectId(sessionId) });

    console.log('✅ Workout deleted');

    res.status(200).json({
      success: true,
      message: 'Workout deleted successfully'
    });

  } catch (err) {
    console.error('❌ Error deleting workout:', err);
    res.status(500).json({
      success: false,
      error: 'Error deleting workout',
      details: err.message
    });
  }
});

module.exports = router;
