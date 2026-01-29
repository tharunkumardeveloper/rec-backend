const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { ObjectId } = require("mongodb");
const { uploadImage, uploadPDF, uploadVideo } = require("../utils/cloudinary");

// POST /api/sessions/add - Save workout session with rep images
router.post("/add", async (req, res) => {
  try {
    const db = getDB();
    const { sessionMeta, repImages } = req.body;

    console.log('💾 Saving workout session:', sessionMeta.athleteName, sessionMeta.activityName);
    console.log(`📦 Payload size - PDF: ${sessionMeta.pdfDataUrl ? (sessionMeta.pdfDataUrl.length / 1024 / 1024).toFixed(2) : 0}MB, Video: ${sessionMeta.videoDataUrl ? (sessionMeta.videoDataUrl.length / 1024 / 1024).toFixed(2) : 0}MB, Screenshots: ${repImages?.length || 0}`);

    // Upload PDF to Cloudinary if provided
    let pdfUrl = null;
    if (sessionMeta.pdfDataUrl) {
      console.log('📄 Uploading PDF to Cloudinary...');
      try {
        const publicId = `${sessionMeta.athleteName}_${sessionMeta.activityName}_${Date.now()}`;
        pdfUrl = await uploadPDF(sessionMeta.pdfDataUrl, 'talenttrack/reports', publicId);
        console.log('✅ PDF uploaded successfully:', pdfUrl);
      } catch (error) {
        console.warn('⚠️ PDF upload failed, storing base64:', error.message);
        pdfUrl = sessionMeta.pdfDataUrl; // Fallback to base64
      }
    }

    // Upload video to Cloudinary if provided
    let videoUrl = null;
    if (sessionMeta.videoDataUrl) {
      console.log('🎥 Uploading video to Cloudinary...');
      try {
        const publicId = `${sessionMeta.athleteName}_${sessionMeta.activityName}_video_${Date.now()}`;
        videoUrl = await uploadVideo(sessionMeta.videoDataUrl, 'talenttrack/videos', publicId);
        console.log('✅ Video uploaded successfully:', videoUrl);
      } catch (error) {
        console.warn('⚠️ Video upload failed, storing base64:', error.message);
        videoUrl = sessionMeta.videoDataUrl; // Fallback to base64
      }
    }

    // Insert session metadata with Cloudinary URLs
    const sessionResult = await db.collection("workout_sessions").insertOne({
      ...sessionMeta,
      pdfUrl,
      videoUrl,
      pdfDataUrl: undefined, // Remove base64
      videoDataUrl: undefined, // Remove base64
      timestamp: new Date(sessionMeta.timestamp),
      createdAt: new Date()
    });

    console.log('✅ Session saved with ID:', sessionResult.insertedId);

    // Upload rep images to Cloudinary
    if (repImages && repImages.length > 0) {
      console.log(`📸 Uploading ${repImages.length} rep images to Cloudinary...`);
      
      const repsWithUrls = await Promise.all(
        repImages.map(async (rep, index) => {
          try {
            const publicId = `${sessionMeta.athleteName}_${sessionMeta.activityName}_rep${rep.repNumber}_${Date.now()}`;
            const imageUrl = await uploadImage(rep.imageData, 'talenttrack/screenshots', publicId);
            console.log(`✅ Rep ${rep.repNumber} uploaded: ${imageUrl.substring(0, 50)}...`);
            
            return {
              ...rep,
              imageUrl,
              imageData: undefined, // Remove base64
              sessionId: sessionResult.insertedId.toString()
            };
          } catch (error) {
            console.warn(`⚠️ Rep ${rep.repNumber} upload failed, storing base64:`, error.message);
            return {
              ...rep,
              imageUrl: rep.imageData, // Fallback to base64
              sessionId: sessionResult.insertedId.toString()
            };
          }
        })
      );

      await db.collection("rep_images").insertMany(repsWithUrls);
      console.log(`✅ Saved ${repImages.length} rep images to MongoDB`);
    }

    res.status(200).json({
      success: true,
      sessionId: sessionResult.insertedId.toString(),
      pdfUrl,
      videoUrl,
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

    console.log(`✅ Found ${workouts.length} workouts for ${athleteName}`);

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
      details: err.message,
      workouts: [] // Return empty array on error
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
