const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const { uploadImage } = require("../utils/cloudinary");

// POST /api/users/profile - Save or update user profile
router.post("/profile", async (req, res) => {
  try {
    const db = getDB();
    const profile = req.body;

    console.log('💾 Saving user profile:', profile.name, profile.role);

    // Upload profile picture to Cloudinary if it's base64
    let profilePicUrl = profile.profilePic;
    if (profile.profilePic && profile.profilePic.startsWith('data:image')) {
      console.log('📸 Uploading profile picture to Cloudinary...');
      try {
        const publicId = `${profile.userId}_profile_${Date.now()}`;
        profilePicUrl = await uploadImage(profile.profilePic, 'talenttrack/profiles', publicId);
        console.log('✅ Profile picture uploaded:', profilePicUrl);
      } catch (error) {
        console.warn('⚠️ Profile picture upload failed, storing base64:', error.message);
      }
    }

    // Upsert user profile
    const result = await db.collection("users").updateOne(
      { userId: profile.userId },
      {
        $set: {
          ...profile,
          profilePic: profilePicUrl,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('✅ User profile saved:', profile.userId);

    res.status(200).json({
      success: true,
      message: 'Profile saved successfully',
      userId: profile.userId,
      profilePicUrl
    });

  } catch (err) {
    console.error('❌ Error saving profile:', err);
    res.status(500).json({
      success: false,
      error: 'Error saving profile',
      details: err.message
    });
  }
});

// PATCH /api/users/profile/:userId - Update specific profile fields
router.patch("/profile/:userId", async (req, res) => {
  try {
    const db = getDB();
    const { userId } = req.params;
    const updates = req.body;

    console.log('🔄 Updating profile fields for:', userId);

    // Upload profile picture to Cloudinary if it's base64
    if (updates.profilePic && updates.profilePic.startsWith('data:image')) {
      console.log('📸 Uploading new profile picture to Cloudinary...');
      try {
        const publicId = `${userId}_profile_${Date.now()}`;
        updates.profilePic = await uploadImage(updates.profilePic, 'talenttrack/profiles', publicId);
        console.log('✅ Profile picture uploaded:', updates.profilePic);
      } catch (error) {
        console.warn('⚠️ Profile picture upload failed:', error.message);
      }
    }

    // Update only the provided fields
    const result = await db.collection("users").updateOne(
      { userId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    console.log('✅ Profile updated:', userId);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      userId
    });

  } catch (err) {
    console.error('❌ Error updating profile:', err);
    res.status(500).json({
      success: false,
      error: 'Error updating profile',
      details: err.message
    });
  }
});

// GET /api/users/profile/:userId - Get user profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const db = getDB();
    const { userId } = req.params;

    console.log('📊 Fetching profile for:', userId);

    const profile = await db.collection("users").findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    console.log('✅ Profile found:', profile.name);

    res.status(200).json({
      success: true,
      profile
    });

  } catch (err) {
    console.error('❌ Error fetching profile:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching profile',
      details: err.message
    });
  }
});

// GET /api/users/all - Get all users (for SAI admin)
router.get("/all", async (req, res) => {
  try {
    const db = getDB();
    const { role } = req.query;

    console.log('👥 Fetching all users, role filter:', role);

    const query = role ? { role } : {};
    const users = await db.collection("users")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${users.length} users`);

    res.status(200).json({
      success: true,
      users,
      count: users.length
    });

  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching users',
      details: err.message
    });
  }
});

// GET /api/users/coaches - Get all coaches
router.get("/coaches", async (req, res) => {
  try {
    const db = getDB();

    console.log('👨‍🏫 Fetching all coaches...');

    const coaches = await db.collection("users")
      .find({ role: 'COACH' })
      .sort({ name: 1 })
      .toArray();

    console.log(`✅ Found ${coaches.length} coaches`);

    res.status(200).json({
      success: true,
      coaches,
      count: coaches.length
    });

  } catch (err) {
    console.error('❌ Error fetching coaches:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching coaches',
      details: err.message
    });
  }
});

// GET /api/users/athletes - Get all athletes
router.get("/athletes", async (req, res) => {
  try {
    const db = getDB();

    console.log('🏃 Fetching all athletes...');

    const athletes = await db.collection("users")
      .find({ role: 'ATHLETE' })
      .sort({ name: 1 })
      .toArray();

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

// GET /api/users/discover - Get users to discover (for social features)
router.get("/discover", async (req, res) => {
  try {
    const { userId } = req.query;
    const db = getDB();

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    console.log('🔍 Discovering users for:', userId);

    // Get existing connections
    const connections = await db.collection('connections').find({
      $or: [
        { fromUserId: userId, status: 'accepted' },
        { toUserId: userId, status: 'accepted' }
      ]
    }).toArray();

    const connectedUserIds = connections.map(c =>
      c.fromUserId === userId ? c.toUserId : c.fromUserId
    );

    console.log('🔗 Connected user IDs:', connectedUserIds);

    // Get ALL users except self and connected users (no limit, no duplicates)
    const users = await db.collection('users')
      .find({
        userId: { $ne: userId, $nin: connectedUserIds }
      })
      .sort({ name: 1 })
      .toArray();

    // Remove any potential duplicates by userId
    const uniqueUsers = Array.from(
      new Map(users.map(user => [user.userId, user])).values()
    );

    console.log('✅ Found discoverable users:', uniqueUsers.length);

    res.json(uniqueUsers);
  } catch (error) {
    console.error('❌ Error fetching discover users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// GET /api/users/:userId - Get specific user by userId
router.get("/:userId", async (req, res) => {
  try {
    const db = getDB();
    const { userId } = req.params;

    console.log('📊 Fetching user:', userId);

    const user = await db.collection("users").findOne({ userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ User found:', user.name);

    res.status(200).json(user);

  } catch (err) {
    console.error('❌ Error fetching user:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching user',
      details: err.message
    });
  }
});

// GET /api/users/:userId/stats - Get user workout stats
router.get("/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const sessions = await db.collection('workout_sessions').find({ athleteId: userId }).toArray();

    const stats = {
      totalWorkouts: sessions.length,
      bestScore: Math.max(...sessions.map(s => s.totalReps || 0), 0),
      avgAccuracy: sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length)
        : 0,
      formQuality: sessions.length > 0
        ? Math.round(sessions.filter(s => s.formScore === 'Excellent').length / sessions.length * 100)
        : 0,
      consistency: sessions.length >= 5 ? 85 : sessions.length * 15
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/users/:userId/skills - Update user skills
router.post("/:userId/skills", async (req, res) => {
  try {
    const { userId } = req.params;
    const { skills } = req.body;
    const db = getDB();

    await db.collection('users').updateOne(
      { userId },
      { $set: { skills, updatedAt: new Date() } }
    );

    res.json({ success: true, message: 'Skills updated' });
  } catch (error) {
    console.error('Error updating skills:', error);
    res.status(500).json({ error: 'Failed to update skills' });
  }
});

module.exports = router;
