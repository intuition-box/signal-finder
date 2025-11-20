// src/utils/analysis.js
import { ethers } from 'ethers';

// EXPORTED Default Trend: Guarantees a stable object for the UI
export function createDefaultTrend() {
    return {
        velocity: 0, 
        acceleration: 0,
        chartData: { labels: [], datasets: [{ data: [] }] },
        percentageChange: 0,
        recentCapital: 0, 
        recentStakers: 0,
        confidence: 0 // Add confidence score for trend reliability
    };
}

// Safe number validation utilities
const safeNumber = (value, fallback = 0) => {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return fallback;
    }
    return value;
};

const safeDivision = (numerator, denominator, fallback = 0) => {
    if (denominator === 0 || !isFinite(denominator)) return fallback;
    const result = numerator / denominator;
    return safeNumber(result, fallback);
};

// Enhanced time bucketing for smoother trends
function bucketDataPoints(dataPoints, bucketSizeHours = 1) {
    if (!dataPoints?.length) return [];
    
    const buckets = new Map();
    const bucketSizeMs = bucketSizeHours * 3600 * 1000;
    
    dataPoints.forEach(point => {
        const bucketKey = Math.floor(point.time.getTime() / bucketSizeMs) * bucketSizeMs;
        if (!buckets.has(bucketKey)) {
            buckets.set(bucketKey, []);
        }
        buckets.get(bucketKey).push(point);
    });
    
    return Array.from(buckets.entries())
        .map(([timestamp, points]) => ({
            time: new Date(timestamp),
            value: points[points.length - 1].value, // Take latest value in bucket
            sampleSize: points.length
        }))
        .sort((a, b) => a.time.getTime() - b.time.getTime());
}

// Improved derivative calculations with confidence scoring
function calculateLogDerivatives(dataPoints, bucketSizeHours = 1) {
    const defaultResult = createDefaultTrend();
    
    if (!dataPoints?.length) return defaultResult;
    
    // Filter valid points and bucket them
    const validPoints = dataPoints.filter(p => p.value > 0);
    if (validPoints.length < 2) return defaultResult;
    
    const bucketedPoints = bucketDataPoints(validPoints, bucketSizeHours);
    if (bucketedPoints.length < 2) return defaultResult;

    try {
        // Convert to log space for percentage-based calculations
        const logPoints = bucketedPoints.map(p => ({ 
            ...p, 
            logValue: Math.log(Math.max(0.01, p.value)) // Prevent log(0)
        }));

        let velocity = 0;
        let acceleration = 0;
        let confidence = Math.min(1, bucketedPoints.length / 10); // More points = higher confidence

        // Calculate velocity (recent trend)
        const recentPoints = logPoints.slice(-3); // Use last 3 points for stability
        if (recentPoints.length >= 2) {
            const weights = recentPoints.map((_, i) => i + 1); // Weight recent points more
            const weightSum = weights.reduce((a, b) => a + b, 0);
            
            let weightedVelocitySum = 0;
            for (let i = 1; i < recentPoints.length; i++) {
                const logChange = recentPoints[i].logValue - recentPoints[i-1].logValue;
                const timeChangeHours = Math.max(0.1, 
                    (recentPoints[i].time.getTime() - recentPoints[i-1].time.getTime()) / (1000 * 3600)
                );
                const pointVelocity = safeDivision(logChange, timeChangeHours);
                weightedVelocitySum += pointVelocity * weights[i-1];
            }
            velocity = safeDivision(weightedVelocitySum, weightSum);
        }

        // Calculate acceleration (change in velocity)
        if (logPoints.length >= 4) {
            const midPoint = Math.floor(logPoints.length / 2);
            const earlyPoints = logPoints.slice(0, midPoint + 1);
            const latePoints = logPoints.slice(midPoint);
            
            // Calculate early and late velocities
            const earlyVel = calculateSimpleVelocity(earlyPoints);
            const lateVel = calculateSimpleVelocity(latePoints);
            
            const totalTimeSpan = Math.max(1, 
                (logPoints[logPoints.length-1].time.getTime() - logPoints[0].time.getTime()) / (1000 * 3600)
            );
            acceleration = safeDivision(lateVel - earlyVel, totalTimeSpan);
        }

        // Calculate percentage change with outlier protection
        const originalFirst = validPoints[0];
        const originalLast = validPoints[validPoints.length - 1];
        const rawPercentage = safeDivision(
            (originalLast.value - originalFirst.value), 
            originalFirst.value, 
            0
        ) * 100;
        
        // Clamp extreme values
        const percentageChange = Math.max(-999, Math.min(9999, rawPercentage));
        
        // Enhanced chart data with smoothing
        const chartData = {
            labels: bucketedPoints.map(p => p.time.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            })),
            datasets: [{ 
                data: bucketedPoints.map(p => p.value),
                metadata: bucketedPoints.map(p => ({
                    sampleSize: p.sampleSize,
                    timestamp: p.time.getTime()
                }))
            }],
        };
        
        return {
            ...defaultResult,
            velocity: safeNumber(velocity),
            acceleration: safeNumber(acceleration),
            chartData,
            percentageChange: safeNumber(percentageChange),
            confidence: safeNumber(confidence, 0.1)
        };
    } catch (e) {
        console.error("Error in calculateLogDerivatives:", e);
        return defaultResult;
    }
}

// Helper function for simple velocity calculation
function calculateSimpleVelocity(points) {
    if (points.length < 2) return 0;
    
    const first = points[0];
    const last = points[points.length - 1];
    const logChange = last.logValue - first.logValue;
    const timeChangeHours = Math.max(0.1, 
        (last.time.getTime() - first.time.getTime()) / (1000 * 3600)
    );
    
    return safeDivision(logChange, timeChangeHours);
}

// Enhanced signal processing with performance optimizations
export const processSignalData = (terms) => {
    if (!terms?.length) return [];

    return terms.map(term => {
        const positions = term.positions || [];
        let capitalTrend = createDefaultTrend();
        let communityTrend = createDefaultTrend();

        if (positions.length > 0) {
            // Sort positions once and reuse
            const sortedPositions = [...positions].sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            const now = new Date();
            const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

            // Pre-allocate arrays for better performance
            const capitalPoints = [];
            const communityPoints = [];
            const recentStakersSet = new Set();
            
            let cumulativeCapital = 0;
            let recentCapital = 0;
            const cumulativeUniqueStakers = new Set();
            let prevCommunitySize = 0;

            // Single pass through positions for efficiency
            sortedPositions.forEach((pos, index) => {
                const posTime = new Date(pos.created_at).getTime();
                
                // Safe ether parsing
                let capitalAmount = 0;
                try {
                    capitalAmount = parseFloat(ethers.utils.formatEther(pos.shares || '0'));
                } catch (e) {
                    console.warn(`Invalid shares value for position ${index}:`, pos.shares);
                }
                
                cumulativeCapital += capitalAmount;
                capitalPoints.push({ 
                    time: new Date(pos.created_at), 
                    value: Math.max(0.01, cumulativeCapital) // Ensure positive values
                });

                // Track unique stakers
                if (!cumulativeUniqueStakers.has(pos.account_id)) {
                    cumulativeUniqueStakers.add(pos.account_id);
                    const newSize = cumulativeUniqueStakers.size;
                    if (newSize !== prevCommunitySize) {
                        communityPoints.push({ 
                            time: new Date(pos.created_at), 
                            value: newSize 
                        });
                        prevCommunitySize = newSize;
                    }
                }

                // Track recent activity
                if (posTime > twentyFourHoursAgo) {
                    recentCapital += capitalAmount;
                    recentStakersSet.add(pos.account_id);
                }
            });
            
            // Calculate trends with error handling
            try {
                capitalTrend = calculateLogDerivatives(capitalPoints);
                communityTrend = calculateLogDerivatives(communityPoints);
            } catch (e) {
                console.error(`Error calculating trends for term ${term.id}:`, e);
            }
            
            // Set recent activity data
            capitalTrend.recentCapital = recentCapital;
            communityTrend.recentStakers = recentStakersSet.size;

            // Enhanced percentage change calculation
            const totalCapital = safeNumber(parseFloat(ethers.utils.formatEther(term.total_market_cap || '0')));
            const prevCapital = Math.max(0.01, totalCapital - recentCapital);
            capitalTrend.percentageChange = safeDivision(recentCapital, prevCapital) * 100;
            
            const totalStakers = term.positions_aggregate?.aggregate?.count || 0;
            const prevStakers = Math.max(1, totalStakers - recentStakersSet.size);
            communityTrend.percentageChange = safeDivision(recentStakersSet.size, prevStakers) * 100;
        }

        return {
            id: term.id,
            label: term.atom?.label,
            image: term.atom?.image,
            type: term.type,
            triple: term.triple,
            totalStaked: term.total_market_cap || '0',
            totalStakers: term.positions_aggregate?.aggregate?.count || 0,
            capitalTrend,
            communityTrend,
        };
    });
};
