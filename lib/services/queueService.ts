import { Queue, Worker } from 'bullmq';
import { getTokenCreationDate, fetchPriceFromAlchemy } from './priceService';
import { savePriceToDB } from '../config/mongodb';
import { redisConnection } from '../config/redis';

//----- Create a BullMQ queue named 'history-fetch' for fetching historical token prices.
//----- Job retry, backoff, and cleanup options are configured.
const historyQueue = new Queue('history-fetch', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5,  // Keep last 5 failed jobs
    attempts: 3,  // Retry a job up to 3 times if it fails
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});


/*
* Worker to process jobs from the 'history-fetch' queue.
* For each job, fetches daily prices from the token's creation date to the present and stores them in the DB.
*/
const historyWorker = new Worker(
  'history-fetch',
  async (job) => {
    const { token, network } = job.data;
    
    try {
      // ✅ Step 1: Get token creation date (used as the starting point for price history)
      const creationDate = await getTokenCreationDate(token, network);
      const creationTimestamp = Math.floor(creationDate.getTime() / 1000);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      // ✅ Step 2: Generate an array of timestamps (1 per day) from creation date to now
      const dailyTimestamps = [];
      for (let ts = creationTimestamp; ts <= currentTimestamp; ts += 86400) {
        dailyTimestamps.push(ts); // 86400 seconds = 1 day
      }
      
      console.log(`Processing ${dailyTimestamps.length} daily prices for ${token} on ${network}`);
      
      // ✅ Step 3: Process timestamps in small batches to avoid hitting rate limits
      const batchSize = 5;
      for (let i = 0; i < dailyTimestamps.length; i += batchSize) {
        const batch = dailyTimestamps.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (timestamp) => {
            try {
              // Fetch historical price from Alchemy for a specific timestamp
              const price = await fetchPriceFromAlchemy(token, network, timestamp);

              // Save the price to the MongoDB database(oracleToken)
              await savePriceToDB(token, network, timestamp, price);
              
              // Update progress of job (in percentage)
              const progress = Math.floor(((i + batch.indexOf(timestamp) + 1) / dailyTimestamps.length) * 100);
              job.updateProgress(progress);
            } catch (error) {
              console.error(`Failed to fetch price for ${timestamp}:`, error);
              // Continue with other timestamps even if one fails
            }
          })
        );
        
        // ✅ Step 4: Introduce delay between batches to respect API rate limits
        if (i + batchSize < dailyTimestamps.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay between batches
        }
      }
      
      console.log(`Completed history fetch for ${token} on ${network}`);
      return { processed: dailyTimestamps.length }; // Return metadata

    } catch (error) {
      console.error('History fetch job failed:', error);
      throw error; // Re-throw to let BullMQ mark the job as failed
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Allow 2 jobs to be processed in parallel manner
  }
);

// Worker event listeners for logging and monitoring
historyWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

historyWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

historyWorker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});


/*
* Function to schedule a new history fetch job for a specific token and network.
* Adds the job to the BullMQ queue.
*/
export async function scheduleHistoryFetch(token: string, network: string) {
  try {
    const job = await historyQueue.add(
      'fetch-history',
      { token, network }, // Job data
      {
        priority: 1, // High priority
        delay: 0,    // Start immediately no delay
      }
    );
    
    console.log(`Scheduled history fetch job ${job.id} for ${token} on ${network}`);
    return job;

  } catch (error) {
    console.error('Failed to schedule history fetch:', error);
    throw error;
  }
}


/**
 * Function to initialize the BullMQ queue system.
 * Cleans up completed and failed jobs older than 24 hours.
 */
export async function initializeQueue() {
  try {
    console.log('🔄 Queue system initialized');
    
    // Clean up completed-jobs older than 24 hours
    await historyQueue.clean(24 * 60 * 60 * 1000, 10, 'completed');

    // Clean up failed-jobs older than 24 hours
    await historyQueue.clean(24 * 60 * 60 * 1000, 5, 'failed');
    
    return true;

  } catch (error) {
    console.error('Failed to initialize queue:', error);
    throw error;
  }
}

/**
 * Graceful shutdown function to close worker and queue connections on process exit.
 */
async function closeQueue() {
  await historyWorker.close();
  await historyQueue.close();
}

process.on('SIGTERM', closeQueue);
process.on('SIGINT', closeQueue);