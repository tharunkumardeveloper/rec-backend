const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../db');

// Social connections routes - Updated 2026-02-21
// Handles connection requests and relationship management

// Get my connections
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const connections = await db.collection('connections').find({
      $or: [
        { fromUserId: userId, status: 'accepted' },
        { toUserId: userId, status: 'accepted' }
      ]
    }).toArray();

    // Get user details for each connection
    const connectedUserIds = connections.map(c => 
      c.fromUserId === userId ? c.toUserId : c.fromUserId
    );

    const users = await db.collection('users').find({
      userId: { $in: connectedUserIds }
    }).toArray();

    res.json(users);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Get pending requests (received)
router.get('/requests/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const requests = await db.collection('connections').find({
      toUserId: userId,
      status: 'pending'
    }).toArray();

    // Enrich with sender details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await db.collection('users').findOne({ userId: request.fromUserId });
        return {
          ...request,
          fromUserName: user?.name,
          fromUserRole: user?.role,
          fromUserProfilePic: user?.profilePic,
          fromUserRegion: user?.district,
          fromUserSkills: user?.skills
        };
      })
    );

    res.json(enrichedRequests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get sent requests
router.get('/requests/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDB();

    const requests = await db.collection('connections').find({
      fromUserId: userId,
      status: 'pending'
    }).toArray();

    // Enrich with recipient details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await db.collection('users').findOne({ userId: request.toUserId });
        return {
          ...request,
          toUserName: user?.name,
          toUserRole: user?.role,
          toUserProfilePic: user?.profilePic
        };
      })
    );

    res.json(enrichedRequests);
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Send connection request
router.post('/request', async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    const db = getDB();

    console.log('📤 Connection request:', fromUserId, '->', toUserId);

    // Check if request already exists
    const existing = await db.collection('connections').findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'Connection request already exists' });
    }

    const request = {
      fromUserId,
      toUserId,
      status: 'pending',
      createdAt: new Date()
    };

    await db.collection('connections').insertOne(request);
    console.log('✅ Connection request sent');
    res.json({ success: true, message: 'Connection request sent' });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Accept connection request
router.post('/request/:requestId/accept', async (req, res) => {
  try {
    const { requestId } = req.params;
    const db = getDB();

    await db.collection('connections').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'accepted',
          acceptedAt: new Date()
        } 
      }
    );

    res.json({ success: true, message: 'Connection accepted' });
  } catch (error) {
    console.error('Error accepting request:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// Reject connection request
router.post('/request/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params;
    const db = getDB();

    await db.collection('connections').updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: 'rejected',
          rejectedAt: new Date()
        } 
      }
    );

    res.json({ success: true, message: 'Connection rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// Check connection status between two users
router.get('/status/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const db = getDB();

    const connection = await db.collection('connections').findOne({
      $or: [
        { fromUserId: userId1, toUserId: userId2 },
        { fromUserId: userId2, toUserId: userId1 }
      ]
    });

    res.json({
      connected: connection?.status === 'accepted',
      status: connection?.status || 'none',
      requestId: connection?._id
    });
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;
