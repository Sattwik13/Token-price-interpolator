import { create } from 'zustand';

interface PriceData {
  price: number;
  source: 'cache' | 'alchemy' | 'interpolated';
}

interface PriceRequest {
  token: string;
  network: string;
  timestamp: number;
}

interface ScheduleRequest {
  token: string;
  network: string;
}

interface PriceStore {
  loading: boolean;
  scheduleLoading: boolean;
  priceData: PriceData | null;
  error: string | null;
  fetchPrice: (request: PriceRequest) => Promise<void>;
  scheduleFullHistory: (request: ScheduleRequest) => Promise<void>;
}

export const usePriceStore = create<PriceStore>((set) => ({
  loading: false,
  scheduleLoading: false,
  priceData: null,
  error: null,

  fetchPrice: async (request: PriceRequest) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch('/api/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch price');
      }

      const data = await response.json();
      set({ priceData: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  scheduleFullHistory: async (request: ScheduleRequest) => {
    set({ scheduleLoading: true, error: null });
    
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule history fetch');
      }

      set({ 
        scheduleLoading: false,
        error: null 
      });
      // You might want to show a success message here
    } catch (error: any) {
      set({ error: error.message, scheduleLoading: false });
    }
  },
}));