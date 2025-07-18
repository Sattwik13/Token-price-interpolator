import { create } from 'zustand';

/**
 * Represents the structure of the price data returned from the backend.
 * - `price`: token price at a given timestamp
 * - `source`: origin of the price (cache, blockchain via Alchemy, or interpolated)
 */
interface PriceData {
  price: number;
  source: 'cache' | 'alchemy' | 'interpolated';
}

/**
 * Defines the payload structure to request a specific token price.
 * - `token`: the token address or symbol
 * - `network`: the blockchain network (e.g., ethereum, polygon)
 * - `timestamp`: UNIX timestamp of the desired price
 */
interface PriceRequest {
  token: string;
  network: string;
  timestamp: number;
}

/**
 * Defines the payload to request full historical scheduling for a token.
 * Used to trigger backend jobs like BullMQ to fetch a range of prices.
 */
interface ScheduleRequest {
  token: string;
  network: string;
}


/**
 * Zustand store interface to define the shape of application state.
 */
interface PriceStore {
  loading: boolean;               // UI loading state for fetching single price
  scheduleLoading: boolean;       // UI loading state for scheduling historical fetch
  priceData: PriceData | null;    // Last fetched token price
  error: string | null;           // Error message for any failures

  fetchPrice: (request: PriceRequest) => Promise<void>;      // API call to get a specific price
  scheduleFullHistory: (request: ScheduleRequest) => Promise<void>;  // API call to schedule historical data fetching
}


/**
 * Zustand hook that manages price-related state and async actions.
 */
export const usePriceStore = create<PriceStore>((set) => ({
  loading: false,
  scheduleLoading: false,
  priceData: null,
  error: null,

  /**
   * Fetches price data for a specific token, network, and timestamp.
   * Makes a POST request to the `/api/price` endpoint.
   */
  fetchPrice: async (request: PriceRequest) => {
    set({ loading: true, error: null }); // Set loading state and clear any existing errors
    
    try {
      const response = await fetch('/api/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // If the API returns an error, extract and throw it
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch price');
      }

      // Update the store with the returned price data
      const data = await response.json();
      set({ priceData: data, loading: false });
    } catch (error: any) {
      // Update the store with the error message and stop loading
      set({ error: error.message, loading: false });
    }
  },


  /**
   * Triggers scheduling of full historical price data fetching.
   * Makes a POST request to the `/api/schedule` endpoint.
   */
  scheduleFullHistory: async (request: ScheduleRequest) => {
    set({ scheduleLoading: true, error: null }); // Set scheduling loading state and clear errors
    
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      // If the API fails, parse the error and throw
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule history fetch');
      }

      // Reset loading and error on success
      set({ 
        scheduleLoading: false,
        error: null 
      });
      // You might want to show a success message here
    } catch (error: any) {
      // Capture any errors and update the store
      set({ error: error.message, scheduleLoading: false });
    }
  },
}));