import { ethers } from 'ethers';

export const processSignalData = (terms, timeframe) => {
  return terms.map(term => {
    // Process market cap and position data
    const totalStaked = term.total_market_cap || '0';
    const totalStakers = term.positions_aggregate?.aggregate?.count || 0;

    // Calculate trends (both capital and community)
    const capitalTrend = calculateTrend(term, 'capital', timeframe);
    const communityTrend = calculateTrend(term, 'community', timeframe);

    return {
      id: term.id,
      label: term.atom?.label || '',
      image: term.atom?.image || '',
      totalStaked,
      totalStakers,
      capitalTrend,
      communityTrend,
      isUpdating: false // Used for real-time updates
    };
  });
};

const calculateTrend = (term, metric, timeframe) => {
  // Default empty trend data
  const defaultTrend = {
    velocity: 0,
    acceleration: 0,
    chartData: {
      labels: [],
      values: []
    }
  };

  // Get historical data from term vaults
  const history = term.vaults?.[0]?.[`share_price_change_stats_${timeframe}`] || [];
  
  if (history.length < 2) return defaultTrend;

  // Process historical data points
  const dataPoints = history.map(point => ({
    timestamp: new Date(point.bucket).getTime(),
    value: parseFloat(ethers.utils.formatEther(point.last_share_price || '0'))
  }));

  // Calculate velocity (rate of change)
  const velocity = calculateVelocity(dataPoints);
  
  // Calculate acceleration (rate of change of velocity)
  const acceleration = calculateAcceleration(dataPoints);

  // Prepare chart data
  const chartData = {
    labels: dataPoints.map(p => new Date(p.timestamp).toISOString()),
    values: dataPoints.map(p => p.value)
  };

  return {
    velocity,
    acceleration,
    chartData
  };
};

const calculateVelocity = (dataPoints) => {
  if (dataPoints.length < 2) return 0;
  const latest = dataPoints[dataPoints.length - 1];
  const previous = dataPoints[dataPoints.length - 2];
  const timeDiff = (latest.timestamp - previous.timestamp) / 3600000; // Convert to hours
  return timeDiff === 0 ? 0 : (latest.value - previous.value) / timeDiff;
};

const calculateAcceleration = (dataPoints) => {
  if (dataPoints.length < 3) return 0;
  const v1 = calculateVelocity(dataPoints.slice(-3, -1));
  const v2 = calculateVelocity(dataPoints.slice(-2));
  return v2 - v1;
};

export const formatNumber = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};