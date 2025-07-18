// Mock the interpolation function for testing
function interpolatePrice(targetTimestamp, beforeData, afterData) {
  const { timestamp: tsBefore, price: priceBefore } = beforeData;
  const { timestamp: tsAfter, price: priceAfter } = afterData;
  
  // Calculate ratio
  const ratio = (targetTimestamp - tsBefore) / (tsAfter - tsBefore);
  
  // Linear interpolation
  const interpolatedPrice = priceBefore + (priceAfter - priceBefore) * ratio;
  
  return interpolatedPrice;
}

describe('Interpolation Engine', () => {
  test('should correctly interpolate price between two points', () => {
    const beforeData = { timestamp: 1000, price: 1.0 };
    const afterData = { timestamp: 2000, price: 2.0 };
    const targetTimestamp = 1500; // Midpoint
    
    const result = interpolatePrice(targetTimestamp, beforeData, afterData);
    
    expect(result).toBe(1.5); // Should be exactly in the middle
  });
  
  test('should handle edge case at start point', () => {
    const beforeData = { timestamp: 1000, price: 1.0 };
    const afterData = { timestamp: 2000, price: 2.0 };
    const targetTimestamp = 1000; // Exactly at start
    
    const result = interpolatePrice(targetTimestamp, beforeData, afterData);
    
    expect(result).toBe(1.0);
  });
  
  test('should handle edge case at end point', () => {
    const beforeData = { timestamp: 1000, price: 1.0 };
    const afterData = { timestamp: 2000, price: 2.0 };
    const targetTimestamp = 2000; // Exactly at end
    
    const result = interpolatePrice(targetTimestamp, beforeData, afterData);
    
    expect(result).toBe(2.0);
  });
  
  test('should handle decreasing prices', () => {
    const beforeData = { timestamp: 1000, price: 2.0 };
    const afterData = { timestamp: 2000, price: 1.0 };
    const targetTimestamp = 1500; // Midpoint
    
    const result = interpolatePrice(targetTimestamp, beforeData, afterData);
    
    expect(result).toBe(1.5);
  });
  
  test('should weight timestamps correctly', () => {
    const beforeData = { timestamp: 1000, price: 1.0 };
    const afterData = { timestamp: 2000, price: 2.0 };
    const targetTimestamp = 1250; // 25% of the way
    
    const result = interpolatePrice(targetTimestamp, beforeData, afterData);
    
    expect(result).toBe(1.25);
  });
});