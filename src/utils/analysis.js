// src/utils/analysis.js
import { ethers } from 'ethers';

// EXPORTED Default Trend: Guarantees a stable object for the UI
export function createDefaultTrend() {
    return {
        velocity: 0, acceleration: 0,
        chartData: { labels: [], datasets: [{ data: [] }] },
        percentageChange: 0,
        recentCapital: 0, recentStakers: 0
    };
}

// Calculates LOGARITHMIC derivatives from a set of {time, value} points
function calculateLogDerivatives(dataPoints, bucketSizeHours = 1) {
    const defaultResult = createDefaultTrend();
    const validPoints = dataPoints?.filter(p => p.value > 0);
    if (!validPoints || validPoints.length < 2) return defaultResult;

    try {
        const logPoints = validPoints.map(p => ({ time: p.time, value: Math.log(p.value) }));
        let velocity = 0, acceleration = 0;

        const last = logPoints[logPoints.length - 1];
        const secondLast = logPoints[logPoints.length - 2];
        const lastLogValueChange = last.value - secondLast.value;
        const lastTimeChangeHours = Math.max(1, (last.time.getTime() - secondLast.time.getTime()) / (1000 * 3600));
        velocity = lastLogValueChange / lastTimeChangeHours;

        if (logPoints.length >= 3) {
            const thirdLast = logPoints[logPoints.length - 3];
            const prevLogValueChange = secondLast.value - thirdLast.value;
            const prevTimeChangeHours = Math.max(1, (secondLast.time.getTime() - thirdLast.time.getTime()) / (1000 * 3600));
            const prevVelocity = prevTimeChangeHours > 0 ? prevLogValueChange / prevTimeChangeHours : 0;
            const velocityChange = velocity - prevVelocity;
            const accelTimeChangeHours = Math.max(1, (last.time.getTime() - thirdLast.time.getTime()) / (2 * 1000 * 3600));
            acceleration = velocityChange / accelTimeChangeHours;
        }

        const originalLast = validPoints[validPoints.length - 1];
        const originalFirst = validPoints[0];
        const percentageChange = originalFirst.value !== 0 ? ((originalLast.value - originalFirst.value) / originalFirst.value) * 100 : 0;
        const displayPercentage = Math.max(-10000, Math.min(10000, percentageChange));
        
        const chartData = {
            labels: validPoints.map(p => p.time.toLocaleDateString()),
            datasets: [{ data: validPoints.map(p => p.value) }],
        };
        
        return {
            ...defaultResult,
            velocity: isNaN(velocity)? 0 : velocity,
            acceleration: isNaN(acceleration)? 0 : acceleration,
            chartData,
            percentageChange: isNaN(displayPercentage)? 0 : displayPercentage
        };
    } catch (e) {
        console.error("Error in calculateLogDerivatives:", e);
        return defaultResult;
    }
}

// Main processing function: maps raw terms to UI-ready signals
export const processSignalData = (terms) => {
    if (!terms) return [];

    return terms.map(term => {
        const positions = term.positions || [];
        let capitalTrend = createDefaultTrend();
        let communityTrend = createDefaultTrend();

        if (positions.length > 0) {
            // *** CRITICAL FIX: Sort by a.created_at vs b.created_at ***
            const sortedPositions = [...positions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const now = new Date();
            const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

            let cumulativeCapital = 0;
            const capitalPoints = [];
            let cumulativeUniqueStakers = new Set();
            const communityPoints = [];
            
            let recentCapital = 0;
            let recentStakersSet = new Set();

            sortedPositions.forEach(pos => {
                const posTime = new Date(pos.created_at).getTime();
                const capitalAmount = parseFloat(ethers.utils.formatEther(pos.shares || '0'));
                
                cumulativeCapital += capitalAmount;
                capitalPoints.push({ time: new Date(pos.created_at), value: cumulativeCapital });

                if (!cumulativeUniqueStakers.has(pos.account_id)) {
                    cumulativeUniqueStakers.add(pos.account_id);
                    communityPoints.push({ time: new Date(pos.created_at), value: cumulativeUniqueStakers.size });
                }

                if (posTime > twentyFourHoursAgo) {
                    recentCapital += capitalAmount;
                    recentStakersSet.add(pos.account_id);
                }
            });
            
            capitalTrend = calculateLogDerivatives(capitalPoints);
            communityTrend = calculateLogDerivatives(communityPoints.filter((p, i, arr) => i === 0 || p.value !== arr[i-1].value));
            
            capitalTrend.recentCapital = recentCapital;
            communityTrend.recentStakers = recentStakersSet.size;

            const totalCapital = parseFloat(ethers.utils.formatEther(term.total_market_cap || '0'));
            const prevCapital = totalCapital - recentCapital;
            capitalTrend.percentageChange = (prevCapital > 0) ? (recentCapital / prevCapital) * 100 : (recentCapital > 0 ? 100 : 0);
            
            const totalStakers = term.positions_aggregate?.aggregate?.count || 0;
            const prevStakers = totalStakers - recentStakersSet.size;
            communityTrend.percentageChange = (prevStakers > 0) ? (recentStakersSet.size / prevStakers) * 100 : (recentStakersSet.size > 0 ? 100 : 0);
        }

        return {
            id: term.id,
            label: term.atom?.label,
            image: term.atom?.image,
            type: term.type, // Pass the type
            triple: term.triple, // 🦉 Pass the semantic triple data
            totalStaked: term.total_market_cap || '0',
            totalStakers: term.positions_aggregate?.aggregate?.count || 0,
            capitalTrend,
            communityTrend,
        };
    });
};