// MongoDB Schema Setup for TalentTrack
// Run this file once to create collections with proper indexes

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function setupDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('talenttrack');

    // ============================================
    // 1. USERS COLLECTION
    // ============================================
    console.log('\n📋 Setting up users collection...');
    
    const usersExists = await db.listCollections({ name: 'users' }).hasNext();
    if (!usersExists) {
      await db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['userId', 'name', 'role'],
            properties: {
              userId: { bsonType: 'string', description: 'Unique user ID' },
              name: { bsonType: 'string', description: 'User full name' },
              role: { 
                enum: ['ATHLETE', 'COACH', 'SAI_ADMIN'],
                description: 'User role'
              },
              district: { bsonType: 'string', description: 'User district' },
              email: { bsonType: 'string', description: 'User email' },
              profilePic: { bsonType: 'string', description: 'Profile picture URL/base64' },
              createdAt: { bsonType: 'date', description: 'Account creation date' }
            }
          }
        }
      });
      console.log('✅ Users collection created');
    }

    // Create indexes for users
    await db.collection('users').createIndex({ userId: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ district: 1 });
    console.log('✅ Users indexes created');

    // ============================================
    // 2. WORKOUT_SESSIONS COLLECTION
    // ============================================
    console.log('\n📋 Setting up workout_sessions collection...');
    
    const sessionsExists = await db.listCollections({ name: 'workout_sessions' }).hasNext();
    if (!sessionsExists) {
      await db.createCollection('workout_sessions', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['athleteName', 'activityName', 'totalReps', 'timestamp'],
            properties: {
              athleteName: { bsonType: 'string', description: 'Athlete name' },
              athleteId: { bsonType: 'string', description: 'Athlete user ID' },
              athleteProfilePic: { bsonType: 'string', description: 'Athlete profile picture' },
              activityName: { bsonType: 'string', description: 'Exercise name (Squats, Push-ups, etc.)' },
              totalReps: { bsonType: 'int', minimum: 0, description: 'Total reps completed' },
              correctReps: { bsonType: 'int', minimum: 0, description: 'Correct form reps' },
              incorrectReps: { bsonType: 'int', minimum: 0, description: 'Incorrect form reps' },
              duration: { bsonType: 'int', minimum: 0, description: 'Workout duration in seconds' },
              accuracy: { bsonType: 'int', minimum: 0, maximum: 100, description: 'Form accuracy percentage' },
              formScore: { bsonType: 'string', description: 'Form score (Excellent, Good, Needs Work)' },
              timestamp: { bsonType: 'date', description: 'Workout completion time' },
              videoDataUrl: { bsonType: 'string', description: 'Base64 encoded video' },
              pdfDataUrl: { bsonType: 'string', description: 'Base64 encoded PDF report' },
              createdAt: { bsonType: 'date', description: 'Record creation time' }
            }
          }
        }
      });
      console.log('✅ Workout_sessions collection created');
    }

    // Create indexes for workout_sessions
    await db.collection('workout_sessions').createIndex({ athleteName: 1, timestamp: -1 });
    await db.collection('workout_sessions').createIndex({ athleteId: 1, timestamp: -1 });
    await db.collection('workout_sessions').createIndex({ activityName: 1 });
    await db.collection('workout_sessions').createIndex({ timestamp: -1 });
    await db.collection('workout_sessions').createIndex({ createdAt: -1 });
    console.log('✅ Workout_sessions indexes created');

    // ============================================
    // 3. REP_IMAGES COLLECTION
    // ============================================
    console.log('\n📋 Setting up rep_images collection...');
    
    const repsExists = await db.listCollections({ name: 'rep_images' }).hasNext();
    if (!repsExists) {
      await db.createCollection('rep_images', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['sessionId', 'repNumber'],
            properties: {
              sessionId: { bsonType: 'string', description: 'Reference to workout_sessions._id' },
              repNumber: { bsonType: 'int', minimum: 1, description: 'Rep sequence number' },
              imageData: { bsonType: 'string', description: 'Base64 encoded image' },
              correct: { bsonType: 'bool', description: 'Whether rep form was correct' },
              details: { 
                bsonType: 'object',
                description: 'Rep metrics (angles, etc.)',
                properties: {
                  angle: { bsonType: 'number' },
                  knee_angle: { bsonType: 'number' },
                  elbow_angle: { bsonType: 'number' },
                  plank_angle: { bsonType: 'number' }
                }
              }
            }
          }
        }
      });
      console.log('✅ Rep_images collection created');
    }

    // Create indexes for rep_images
    await db.collection('rep_images').createIndex({ sessionId: 1, repNumber: 1 });
    await db.collection('rep_images').createIndex({ sessionId: 1 });
    console.log('✅ Rep_images indexes created');

    // ============================================
    // 4. DISPLAY CURRENT STATS
    // ============================================
    console.log('\n📊 Database Statistics:');
    
    const usersCount = await db.collection('users').countDocuments();
    const sessionsCount = await db.collection('workout_sessions').countDocuments();
    const repsCount = await db.collection('rep_images').countDocuments();
    
    console.log(`   Users: ${usersCount}`);
    console.log(`   Workout Sessions: ${sessionsCount}`);
    console.log(`   Rep Images: ${repsCount}`);

    // ============================================
    // 5. SAMPLE DATA (Optional)
    // ============================================
    console.log('\n💡 Sample queries you can run:');
    console.log('   - Get all athletes: db.users.find({ role: "ATHLETE" })');
    console.log('   - Get athlete workouts: db.workout_sessions.find({ athleteName: "Ratheesh" })');
    console.log('   - Get rep images: db.rep_images.find({ sessionId: "session_001" })');

    console.log('\n✅ Database setup complete!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

// Run setup
setupDatabase();
