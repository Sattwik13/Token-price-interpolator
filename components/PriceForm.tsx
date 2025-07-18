'use client';

import { useState } from 'react';
import { Search, Clock, TrendingUp, Database } from 'lucide-react';
import { usePriceStore } from '../store/priceStore';

const NETWORKS = [
  { value: 'ethereum', label: 'Ethereum', color: 'bg-blue-500' },
  { value: 'polygon', label: 'Polygon', color: 'bg-purple-500' },
];

export default function PriceForm() {
  const [tokenAddress, setTokenAddress] = useState('');
  const [network, setNetwork] = useState('ethereum');
  const [timestamp, setTimestamp] = useState('');
  const [dateInput, setDateInput] = useState('');
  
  const { 
    loading, 
    priceData, 
    error, 
    scheduleLoading,
    fetchPrice, 
    scheduleFullHistory 
  } = usePriceStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddress || !timestamp) return;
    
    await fetchPrice({
      token: tokenAddress,
      network,
      timestamp: parseInt(timestamp)
    });
  };

  const handleSchedule = async () => {
    if (!tokenAddress) return;
    
    await scheduleFullHistory({
      token: tokenAddress,
      network
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setDateInput(date);
    if (date) {
      const unixTimestamp = Math.floor(new Date(date).getTime() / 1000);
      setTimestamp(unixTimestamp.toString());
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'cache':
        return <Database className="w-4 h-4 text-green-500" />;
      case 'alchemy':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'interpolated':
        return <Clock className="w-4 h-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'cache':
        return 'Cached';
      case 'alchemy':
        return 'Live API';
      case 'interpolated':
        return 'Interpolated';
      default:
        return source;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            Historical Token Price Oracle
          </h1>
          <p className="text-blue-100">
            Get historical token prices with intelligent interpolation
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Address
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                placeholder="0xA0b869...c2d6"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Network Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Network
              </label>
              <div className="grid grid-cols-2 gap-3">
                {NETWORKS.map((net) => (
                  <button
                    key={net.value}
                    type="button"
                    onClick={() => setNetwork(net.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      network === net.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${net.color}`} />
                      <span className="font-medium">{net.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date/Timestamp Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="datetime-local"
                  value={dateInput}
                  onChange={handleDateChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unix Timestamp
                </label>
                <input
                  type="number"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  placeholder="1678901234"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span>{loading ? 'Fetching...' : 'Get Price'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleSchedule}
                disabled={scheduleLoading}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
              >
                {scheduleLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <span>{scheduleLoading ? 'Scheduling...' : 'Schedule Full History'}</span>
              </button>
            </div>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Price Result */}
          {priceData && (
            <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Price Result</h3>
                <div className="flex items-center space-x-2">
                  {getSourceIcon(priceData.source)}
                  <span className="text-sm font-medium text-gray-600">
                    {getSourceLabel(priceData.source)}
                  </span>
                </div>
              </div>
              
              <div className="text-3xl font-bold text-gray-900 mb-2">
                ${priceData.price.toFixed(6)}
              </div>
              
              <div className="text-sm text-gray-600">
                <p className="break-all">Token: {tokenAddress}</p>
                <p>Network: {network}</p>
                <p>Timestamp: {timestamp} ({new Date(parseInt(timestamp) * 1000).toLocaleString()})</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}