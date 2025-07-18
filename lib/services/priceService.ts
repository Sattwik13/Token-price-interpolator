import {
  Alchemy,
  Network,
  AssetTransfersCategory, // IMPROVEMENT: Import enum
  SortingOrder,           // IMPROVEMENT: Import enum
} from 'alchemy-sdk';
import pRetry from 'p-retry';
import { getFromCache, setCache } from '../config/redis';
import { getPriceFromDB, savePriceToDB } from '../config/mongodb';

// IMPROVEMENT: Define a type for price data points for better type safety
interface PriceDataPoint {
  timestamp: number;
  price: number;
}

// 🔧----- Utility: Initialize Alchemy SDK for a given network
const getAlchemyInstance = (network: string) => {
  const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: network === 'ethereum' ? Network.ETH_MAINNET : Network.MATIC_MAINNET,
  };
  return new Alchemy(config);
};

// 🔍 ------ Get token creation date by fetching the earliest ERC20 transfer
export async function getTokenCreationDate(tokenAddress: string, network: string): Promise<Date> {
  const alchemy = getAlchemyInstance(network);

  try {
    const transfers = await pRetry(
      async () => {
        return await alchemy.core.getAssetTransfers({
          contractAddresses: [tokenAddress],
          
          order: SortingOrder.ASCENDING,
          maxCount: 1,
          
          category: [AssetTransfersCategory.ERC20],
          withMetadata: true,
        });
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
        },
      }
    );

    // Return the timestamp of the first transfer (i.e., creation date)
    if (transfers.transfers.length > 0) {
      const firstTransfer = transfers.transfers[0];

      // FIX: The blockTimestamp is nested inside the 'metadata' property.
      if (firstTransfer.metadata && firstTransfer.metadata.blockTimestamp) {
        return new Date(firstTransfer.metadata.blockTimestamp);
      }
      // Provide a more descriptive error if the structure is unexpected
      throw new Error('Metadata or blockTimestamp not found in the first transfer result');
    }

    throw new Error('No transfers found for token');
  } catch (error) {
    console.error('Error getting token creation date:', error);
    throw error;
  }
}

// 🔄 ------ Fetch token price from Alchemy (simulated for demo purposes)
async function fetchPriceFromAlchemy(tokenAddress: string, network: string, timestamp: number): Promise<number> {
  const alchemy = getAlchemyInstance(network);
  
  try {
    const price = await pRetry(
      async () => {
        // This is a simplified example.
        const blockNumber = await alchemy.core.getBlockNumber();
        const basePrice = 1.0;
        const variation = Math.sin(timestamp / 86400) * 0.1;
        const simulatedPrice = basePrice + variation;
        
        return Math.max(0.001, simulatedPrice);
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          if (error.message.includes('429')) {
            console.log('Rate limited, retrying...');
          }
        },
      }
    );

    return price;
  } catch (error) {
    console.error('Error fetching price from Alchemy:', error);
    throw error;
  }
}

// 📈 ------ Linearly interpolate between two prices
function interpolatePrice(targetTimestamp: number, beforeData: PriceDataPoint, afterData: PriceDataPoint): number {
  const { timestamp: tsBefore, price: priceBefore } = beforeData;
  const { timestamp: tsAfter, price: priceAfter } = afterData;

  // Avoid division by zero if timestamps are the same
  if (tsAfter === tsBefore) {
    return priceBefore;
  }
  
  const ratio = (targetTimestamp - tsBefore) / (tsAfter - tsBefore);
  return priceBefore + (priceAfter - priceBefore) * ratio;
}

//----- Get nearest available price data points for interpolation
async function getNearestPrices(tokenAddress: string, network: string, timestamp: number): Promise<{ before: PriceDataPoint; after: PriceDataPoint }> {
  try {
    const nearestPrices = await getPriceFromDB(tokenAddress, network, timestamp, true);

    if (nearestPrices.before && nearestPrices.after) {
      return nearestPrices;
    }
    
    const dayBefore = timestamp - 86400;
    const dayAfter = timestamp + 86400;
    
    const [priceBefore, priceAfter] = await Promise.all([
      fetchPriceFromAlchemy(tokenAddress, network, dayBefore),
      fetchPriceFromAlchemy(tokenAddress, network, dayAfter)
    ]);
    
    const beforeData: PriceDataPoint = { timestamp: dayBefore, price: priceBefore };
    const afterData: PriceDataPoint = { timestamp: dayAfter, price: priceAfter };
    
    await Promise.all([
      savePriceToDB(tokenAddress, network, dayBefore, priceBefore),
      savePriceToDB(tokenAddress, network, dayAfter, priceAfter)
    ]);
    
    return { before: beforeData, after: afterData };
  } catch (error) {
    console.error('Error getting nearest prices:', error);
    throw error;
  }
}

//🌟 -------- Main Function: Get token price with caching, DB fallback, and interpolation
export async function getPriceWithInterpolation(tokenAddress: string, network: string, timestamp: number) {
  const cacheKey = `price:${tokenAddress}:${network}:${timestamp}`;
  
  try {
    //  ✅ 1. Check Redis cache
    const cachedPrice = await getFromCache(cacheKey);
    if (cachedPrice) {
      return { price: parseFloat(cachedPrice), source: 'cache' };
    }
    
    // ✅ 2. Check MongoDB
    const dbPrice = await getPriceFromDB(tokenAddress, network, timestamp);
    if (dbPrice) {
      await setCache(cacheKey, dbPrice.toString(), 300);
      // IMPROVEMENT: More accurate source logging
      return { price: dbPrice, source: 'database' };
    }

    // ✅ 3. Try fetching exact price from Alchemy
    try {
      const alchemyPrice = await fetchPriceFromAlchemy(tokenAddress, network, timestamp);
      await savePriceToDB(tokenAddress, network, timestamp, alchemyPrice);
      await setCache(cacheKey, alchemyPrice.toString(), 300);
      
      return { price: alchemyPrice, source: 'alchemy' };
    } catch (alchemyError) {
      console.log('Exact price not found, falling back to interpolation...');
      
      // ✅ 4. Use interpolation as a fallback
      const nearestPrices = await getNearestPrices(tokenAddress, network, timestamp);
      const interpolatedPrice = interpolatePrice(timestamp, nearestPrices.before, nearestPrices.after);
      await setCache(cacheKey, interpolatedPrice.toString(), 300);
      
      return { price: interpolatedPrice, source: 'interpolated' };
    }
  } catch (error) {
    console.error('Error in getPriceWithInterpolation:', error);
    throw error;
  }
}

// Export fetch function separately if needed
export { fetchPriceFromAlchemy };
