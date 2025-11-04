// src/components/SignalTable.jsx
import React from 'react';
import { ethers } from 'ethers';
import { SparklineChart } from './SparklineChart.jsx';
import { formatNumber } from '../utils/format.js';
import { createDefaultTrend } from '../utils/analysis.js';
import { StakeActions } from './StakeActions.jsx'; // Import the reusable component

// 👽 Helper component for the semantic triple
const TripleClaim = ({ triple }) => {
  if (!triple) return <span className="text-gray-500">Claim data loading...</span>;
  const subject = triple.subject?.label || '...';
  const predicate = triple.predicate?.label || '...';
  const object = triple.object?.label || '...';
  
  return (
      <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-2 py-0.5 bg-gray-700 text-white rounded text-xs font-semibold">{subject}</span>
          <span className="text-gray-400 text-xs">{predicate}</span>
          <span className="px-2 py-0.5 bg-gray-700 text-white rounded text-xs font-semibold">{object}</span>
      </div>
  );
};

export const SignalTable = ({ signals, provider, metricLens, refreshData, sortLens }) => {
  const portalBaseUrl = "https://portal.intuition.systems/explore/atom/";
  const isHeavyweight = sortLens === 'heavyweight';

  const toHttpGateway = (ipfsUrl) => {
    if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) return ipfsUrl;
    return `https://ipfs.io/ipfs/${ipfsUrl.substring(7)}`;
  };

  return (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4 text-left w-12">#</th>
            <th className="py-3 px-4 text-left">On-Chain Item / Claim</th>
            <th className="py-3 px-4 text-left">Type</th>
            {/* 👽 Conditionally hide/show columns */}
            {isHeavyweight ? (
              <th className="py-3 px-4 text-left">24H Activity</th>
            ) : (
              <>
                <th className="py-3 px-4 text-left">Trend</th>
                <th className="py-3 px-4 text-left">Velocity (% Change)</th>
                <th className="py-3 px-4 text-left">Acceleration</th>
              </>
            )}
            <th className="py-3 px-4 text-left">Total</th>
            <th className="py-3 px-4 text-center">Act</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {signals.map((signal, index) => {
            const capitalTrend = signal.capitalTrend || createDefaultTrend();
            const communityTrend = signal.communityTrend || createDefaultTrend();
            const trend = metricLens === 'capital' ? capitalTrend : communityTrend;
            const percentageChange = trend.percentageChange;
            const velocity = trend.velocity;
            const chartData = trend.chartData; 
            const isTriple = signal.type === 'Triple' || signal.type === 'CounterTriple';

            return (
              <tr key={signal.id} className={`${isTriple ? 'bg-gray-800/20' : ''} hover:bg-gray-800/50`}>
                <td className="py-4 px-4 text-gray-400">{index + 1}</td>
                <td className="py-4 px-4 max-w-xs xl:max-w-md">
                  {/* 🦉 Render Atom or Triple */}
                  {isTriple ? (
                    <TripleClaim triple={signal.triple} />
                  ) : (
                    <div className="flex items-center gap-3">
                      <img 
                        src={toHttpGateway(signal.image) || `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIGZpbGw9IiMyZDM3NDgiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIC8+PC9zdmc+`} 
                        alt={signal.label || signal.id}
                        className="w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0"
                      />
                      <div className="overflow-hidden">
                        <div className="font-semibold text-white truncate" title={signal.label || signal.id}>
                          {signal.label || signal.id.slice(0, 12) + '...'}
                        </div>
                      </div>
                    </div>
                  )}
                  <a
                    href={`${portalBaseUrl}${signal.id}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate transition-colors"
                    title={`View signal ${signal.id} on Intuition Portal`}
                  >
                    {signal.id}
                  </a>
                </td>
                <td className="py-4 px-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isTriple ? 'bg-orange-600/30 text-orange-300' : 'bg-blue-600/30 text-blue-300'}`}>
                        {isTriple ? 'Claim' : 'Atom'}
                    </span>
                </td>
                
                {isHeavyweight ? (
                  // 🧠 New Column for Heavyweights
                  <td className={`py-4 px-4 font-bold ${metricLens === 'capital' ? (capitalTrend.recentCapital > 0 ? 'text-green-500' : 'text-gray-500') : (communityTrend.recentStakers > 0 ? 'text-green-500' : 'text-gray-500')}`}>
                    {metricLens === 'capital' ? (
                      <>
                        <div>+{formatNumber(capitalTrend.recentCapital)} $TRUST</div>
                        <div className="text-xs text-gray-400 font-normal">(24h)</div>
                      </>
                    ) : (
                      <>
                        <div>+{formatNumber(communityTrend.recentStakers)} Stakers</div>
                        <div className="text-xs text-gray-400 font-normal">(24h)</div>
                      </>
                    )}
                  </td>
                ) : (
                  // 🧠 Columns for Trending/Emerging
                  <>
                    <td className="py-4 px-4">
                      {chartData && chartData.labels.length > 1 ? (
                        <SparklineChart data={chartData} velocity={velocity} />
                      ) : <div className='w-24 h-8'/>}
                    </td>
                    <td className={`py-4 px-4 font-bold ${velocity >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      <div>
                        {velocity >= 0 ? '+' : ''}{formatNumber(velocity)}
                        <span className="text-gray-400 font-normal text-xs"> {metricLens === 'capital' ? '$T/hr' : ' U/hr'}</span>
                      </div>
                      <div className={`text-xs font-normal ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                      </div>
                    </td>
                    <td className={`py-4 px-4 text-lg font-mono ${trend?.acceleration >= 0.1 ? 'text-green-400' : trend?.acceleration <= -0.1 ? 'text-red-400' : 'text-gray-500'}`}>
                      {trend?.acceleration > 0.1 ? '▲' : trend?.acceleration < -0.1 ? '▼' : '▬'}
                    </td>
                  </>
                )}
                
                <td className="py-4 px-4">
                  <div className="font-bold text-white">
                    {metricLens === 'capital' 
                      ? formatNumber(ethers.utils.formatEther(signal.totalStaked || '0')) 
                      : formatNumber(signal.totalStakers || 0)}
                  </div>
                  <div className="text-xs text-gray-400">{metricLens === 'capital' ? '$TRUST' : 'Stakers'}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-center">
                     <StakeActions
                       signalId={signal.id}
                       provider={provider}
                       refreshData={refreshData}
                       type={signal.type}
                     />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};