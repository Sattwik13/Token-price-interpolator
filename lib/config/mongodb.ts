import { MongoClient } from 'mongodb';

let db: any;
let client: any;

async function connectMongoDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/oracleToken';
    
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    await client.connect();
    db = client.db();
    
    // Create indexes for better performance
    await createIndexes();
    
    console.log('🍃 Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function createIndexes() {
  try {
    if (!db) await connectMongoDB();
    const pricesCollection = db.collection('prices');
    
    // Compound index for efficient queries
    await pricesCollection.createIndex(
      { token: 1, network: 1, timestamp: 1 },
      { unique: true }
    );
    
    // Index for timestamp range queries
    await pricesCollection.createIndex({ timestamp: 1 });
    
    console.log('📊 Database indexes created');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

export async function savePriceToDB(token: string, network: string, timestamp: number, price: number) {
  try {
    if (!db) await connectMongoDB();
    const pricesCollection = db.collection('prices');
    
    await pricesCollection.updateOne(
      { token, network, timestamp },
      {
        $set: {
          token,
          network,
          timestamp,
          price,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    return true;
  } catch (error) {
    console.error('Error saving price to DB:', error);
    throw error;
  }
}

export async function getPriceFromDB(token: string, network: string, timestamp: number, findNearest = false) {
  try {
    if (!db) await connectMongoDB();
    const pricesCollection = db.collection('prices');
    
    if (!findNearest) {
      // Exact match
      const result = await pricesCollection.findOne({
        token,
        network,
        timestamp
      });
      
      return result ? result.price : null;
    } else {
      // Find nearest prices for interpolation
      const [beforeResult, afterResult] = await Promise.all([
        pricesCollection.findOne(
          { token, network, timestamp: { $lte: timestamp } },
          { sort: { timestamp: -1 } }
        ),
        pricesCollection.findOne(
          { token, network, timestamp: { $gte: timestamp } },
          { sort: { timestamp: 1 } }
        )
      ]);
      
      return {
        before: beforeResult ? { timestamp: beforeResult.timestamp, price: beforeResult.price } : null,
        after: afterResult ? { timestamp: afterResult.timestamp, price: afterResult.price } : null
      };
    }
  } catch (error) {
    console.error('Error getting price from DB:', error);
    throw error;
  }
}

export async function getPriceHistory(token: string, network: string, startTimestamp: number, endTimestamp: number) {
  try {
    if (!db) await connectMongoDB();
    const pricesCollection = db.collection('prices');
    
    const results = await pricesCollection.find({
      token,
      network,
      timestamp: {
        $gte: startTimestamp,
        $lte: endTimestamp
      }
    }).sort({ timestamp: 1 }).toArray();
    
    return results;
  } catch (error) {
    console.error('Error getting price history from DB:', error);
    throw error;
  }
}

// Graceful shutdown
async function closeMongoDB() {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

process.on('SIGTERM', closeMongoDB);
process.on('SIGINT', closeMongoDB);