// src/utils/analysis.js
import { ethers } from 'ethers';

// Default structure for trend data
function createDefaultTrend() {
    return {
        chartData: { labels: [], datasets: [{ data: [] }] },
        percentageChange: 0,
        // Our new, more robust metrics:
        recentCapital: 0,
        recentStakers: 0,
        // Deprecated derivative-based metrics (can be re-added later)
        velocity: 0, 
        acceleration: 0
    };
}

// Generates chart data from a list of {time, value} points
function generateChartData(dataPoints) {
    if (!dataPoints || dataPoints.length < 2) {
        return { labels: [], datasets: [{ data: [] }] };
    }
    return {
        labels: dataPoints.map(p => p.time.toLocaleDateString()),
        datasets: [{ data: dataPoints.map(p => p.value) }],
    };
}

export const processSignalData = (terms) => {
    if (!terms) return [];

    return terms.map(term => {
        const positions = term.positions || [];
        let capitalTrend = createDefaultTrend();
        let communityTrend = createDefaultTrend();

        if (positions.length > 0) {
            positions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const now = new Date();
            const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

            let cumulativeCapital = 0;
            const capitalPoints = [];
            let cumulativeUniqueStakers = new Set();
            const communityPoints = [];
            
            let recentCapital = 0;
            let recentStakers = new Set();

            positions.forEach(pos => {
                const posTime = new Date(pos.created_at).getTime();
                const capitalAmount = parseFloat(ethers.utils.formatEther(pos.shares || '0'));
                
                // 1. Calculate cumulative data for charts
                cumulativeCapital += capitalAmount;
                capitalPoints.push({ time: new Date(pos.created_at), value: cumulativeCapital });

                cumulativeUniqueStakers.add(pos.account_id);
                communityPoints.push({ time: new Date(pos.created_at), value: cumulativeUniqueStakers.size });

                // 2. Calculate recent activity metrics
                if (posTime > twentyFourHoursAgo) {
                    recentCapital += capitalAmount;
                    recentStakers.add(pos.account_id);
                }
            });
            
            // Filter for actual changes to make community chart cleaner
            const uniqueCommunityPoints = communityPoints.filter((p, i, arr) => i === 0 || p.value !== arr[i-1].value);

            // 3. Calculate Percentage Changes
            const totalCapital = parseFloat(ethers.utils.formatEther(term.total_market_cap || '0'));
            const capitalPercChange = (totalCapital > 0) ? (recentCapital / totalCapital) * 100 : (recentCapital > 0 ? 100 : 0);
            
            const totalStakers = term.positions_aggregate?.aggregate?.count || 0;
            const communityPercChange = (totalStakers > 0) ? (recentStakers.size / totalStakers) * 100 : (recentStakers.size > 0 ? 100 : 0);

            capitalTrend = {
                ...createDefaultTrend(),
                recentCapital: recentCapital,
                chartData: generateChartData(capitalPoints),
                percentageChange: isNaN(capitalPercChange) ? 0 : capitalPercChange
            };
            
            communityTrend = {
                ...createDefaultTrend(),
                recentStakers: recentStakers.size,
                chartData: generateChartData(uniqueCommunityPoints),
                percentageChange: isNaN(communityPercChange) ? 0 : communityPercChange
            };
        }

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