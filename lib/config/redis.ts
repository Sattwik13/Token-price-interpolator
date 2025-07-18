import { createClient } from 'redis';

let redisClient: any;
let redisConnection: any;

/**
 * Establishes a connection to the Redis server.
 * Sets up event listeners for connection and error handling.
 * Also sets up a configuration object for BullMQ usage.
 * 
 * @returns {Promise<any>} Returns the connected redis client
 */
async function connectRedis() {
  try {
    // Create Redis client using socket connection options and authentication
    redisClient = createClient({
      // url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        host: process.env.REDIS_HOST, // Redis server hostname from environment
        port: parseInt(process.env.REDIS_PORT || '6379'),

        // Reconnection strategy: Retry up to 6 times, then throw error if unsuccessful
        reconnectStrategy: (retries) => {
          if (retries > 6) {
            return new Error('Too many retries'); // Stop retrying after 6 attempts
          }
          // Wait longer with each retry, up to 3 seconds
          return Math.min(retries * 100, 3000);
        }
      },
      username: process.env.REDIS_USERNAME || 'default', // Username (Redis Cloud requires this
      password: process.env.REDIS_PASSWORD,
    });

    // Handle connection errors
    redisClient.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });

    // Handle successful connection events
    redisClient.on('connect', () => {
      const port = redisClient.options?.socket?.port;
      const host = redisClient.options?.socket?.host;
      console.log(`📦 Connected to Redis-cloud(oracleToken) ${port}`);
    });

    // Connect to Redis server
    await redisClient.connect();
    
    // Create a separate connection config object for BullMQ usage
    redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    };

  // Return Redis client instance  
  return redisClient;

  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
}


/**
 * Get a value from Redis cache for the given key.
 * Establishes a connection if not already connected.
 * 
 * @param {string} key - The cache key
 * @returns {Promise<string | null>} The cached value, or null if error/not found
 */
export async function getFromCache(key: string) {
  try {
    if (!redisClient) await connectRedis(); // Connect if not already connected
    return await redisClient.get(key); // Fetch the value for the key from Redis
    
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
}


/**
 * Set a value in Redis cache with an optional time-to-live (TTL).
 * Establishes a connection if not already connected.
 * 
 * @param {string} key - The cache key
 * @param {string} value - The value to cache
 * @param {number} ttl - Time-to-live in seconds (default: 300 seconds)
 * @returns {Promise<boolean>} Success status
 */
export async function setCache(key: string, value: string, ttl = 300) {
  try {
    if (!redisClient) await connectRedis(); // Connect if not already connected
    await redisClient.setEx(key, ttl, value); // Set value with TTL
    return true;

  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
}


/**
 * Delete a value from Redis cache for the given key.
 * Establishes a connection if not already connected.
 * 
 * @param {string} key - The cache key to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFromCache(key: string) {
  try {
    if (!redisClient) await connectRedis(); // Connect if not already connected
    await redisClient.del(key); // Delete key
    return true;

  } catch (error) {
    console.error('Redis DELETE error:', error);
    return false;
  }
}


export { redisConnection };