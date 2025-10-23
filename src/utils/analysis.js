// src/utils/analysis.js
import { ethers } from 'ethers';

// Default structure for trend data
function createDefaultTrend() {
  return { velocity: 0, acceleration: 0, chartData: { labels: [], datasets: [{ data: [] }] }, percentageChange: 0 };
}

// Calculates derivatives from RAW positions data
function calculateTrendFromPositions(positions) {
    if (!positions || positions.length < 2) {
        return createDefaultTrend();
    }

    // Ensure sorted chronologically
    positions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // --- Velocity based on last two distinct trades ---
    let velocity = 0;
    let acceleration = 0; // Acceleration calculation from raw trades is complex, default to 0 for now
    let percentageChange = 0; // Percentage change calculation needs refinement based on total value over time

    const lastTrade = positions[positions.length - 1];
    let secondLastTrade = positions[positions.length - 2];
    let i = positions.length - 3;
    // Find the *actual* previous trade if multiple happened at the exact same time
     while (new Date(secondLastTrade.created_at).getTime() === new Date(lastTrade.created_at).getTime() && i >= 0) {
         secondLastTrade = positions[i];
         i--;
     }

    const lastAmount = parseFloat(ethers.utils.formatEther(lastTrade.shares || '0'));
    const timeDiffHours = (new Date(lastTrade.created_at).getTime() - new Date(secondLastTrade.created_at).getTime()) / (1000 * 3600);

    if (timeDiffHours > 0) {
        velocity = lastAmount / timeDiffHours; // Simple velocity: amount of last trade / time since previous
    }
    
    // --- Chart Data Preparation (Simplified: show cumulative shares over time) ---
    let cumulativeShares = 0;
    const dataPoints = positions.map(pos => {
        cumulativeShares += parseFloat(ethers.utils.formatEther(pos.shares || '0'));
        return { time: new Date(pos.created_at), value: cumulativeShares };
    });
    
    // Simple percentage change (Last vs First trade amount) - needs refinement
    const firstAmount = parseFloat(ethers.utils.formatEther(positions[0].shares || '0'));
     if (firstAmount !== 0) {
         percentageChange = ((lastAmount - firstAmount) / Math.abs(firstAmount)) * 100;
     }


    const chartData = {
        labels: dataPoints.map(p => p.time.toLocaleDateString()),
        datasets: [{ data: dataPoints.map(p => p.value) }],
    };

    return { velocity, acceleration, chartData, percentageChange };
}

export const processSignalData = (terms) => { // Timeframe no longer needed here
    if (!terms) return [];

    return terms.map(term => {
        const capitalTrend = calculateTrendFromPositions(term.positions);
        
        // Simplified Community Trend (Velocity based on last 2 trades)
        let communityVelocity = 0;
        if(term.positions && term.positions.length >= 2) {
            const lastTrade = term.positions[term.positions.length - 1];
            const secondLastTrade = term.positions[term.positions.length - 2];
            const timeDiffHours = (new Date(lastTrade.created_at).getTime() - new Date(secondLastTrade.created_at).getTime()) / (1000 * 3600);
            if(timeDiffHours > 0) {
                communityVelocity = 1 / timeDiffHours; // Approx 1 user / time
            }
        }
        const communityTrend = { ...createDefaultTrend(), velocity: communityVelocity };


        return {
            id: term.id,
            label: term.atom?.label,
            image: term.atom?.image,
            totalStaked: term.total_market_cap || '0',
            totalStakers: term.positions_aggregate?.aggregate?.count || 0,
            capitalTrend,
            communityTrend,
        };
    });
};