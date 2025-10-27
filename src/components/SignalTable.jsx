// src/components/SignalTable.jsx
import React from 'react';
import { ethers } from 'ethers';
import { useState } from 'react';
import { SparklineChart } from './SparklineChart.jsx';
import { formatNumber } from '../utils/format.js';

// --- Verified Contract Addresses ---
const INTUITION_PROTOCOL_ADDRESS = "0xB92EA1B47E4ABD0a520E9138BB59dBd1bC6C475B";
const TRUST_TOKEN_ADDRESS = "0x926AD51f22Fb0e8764A6feF375465A662E7a8BE0";
const INTUITION_PROTOCOL_ABI = ["function stake(bytes32 termId, uint256 amount, bool isSupport)"];
const TRUST_TOKEN_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];

const StakeActions = ({ signalId, provider }) => {
  const [amount, setAmount] = useState('0.1');
  const [isLoading, setIsLoading] = useState(false);

  const handleStake = async (isSupport) => {
    if (!provider || !provider.getSigner) return alert('Please connect a valid wallet first.');
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount to stake.');
    
    setIsLoading(true);
    try {
      const signer = provider.getSigner();
      const trustTokenContract = new ethers.Contract(TRUST_TOKEN_ADDRESS, TRUST_TOKEN_ABI, signer);
      const intuitionProtocolContract = new ethers.Contract(INTUITION_PROTOCOL_ADDRESS, INTUITION_PROTOCOL_ABI, signer);
      const amountWei = ethers.utils.parseEther(amount);

      const approveTx = await trustTokenContract.approve(INTUITION_PROTOCOL_ADDRESS, amountWei);
      await approveTx.wait();

      const stakeTx = await intuitionProtocolContract.stake(signalId, amountWei, isSupport);
      await stakeTx.wait();
      
      alert('Staking successful!');
    } catch (error) {
      console.error('Staking failed:', error);
      alert('Staking failed. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
       <input 
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-20 bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
        step="0.1" min="0" placeholder="0.0" disabled={isLoading}
      />
      <button onClick={() => handleStake(true)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'For'}</button>
      <button onClick={() => handleStake(false)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'Against'}</button>
    </div>
  );
};

export const SignalTable = ({ signals, provider, metricLens, refreshData }) => {
  const portalBaseUrl = "https://portal.intuition.systems/explore/term/";

  if (!signals || signals.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <h2>No signals found matching the current criteria.</h2>
      </div>
    );
  }

  return (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4 text-left w-12">#</th>
            <th className="py-3 px-4 text-left">On-Chain Item / Claim</th>
            <th className="py-3 px-4 text-left">Trend</th>
            <th className="py-3 px-4 text-left">24H Activity</th>
            <th className="py-3 px-4 text-left">New Stakers (24H)</th>
            <th className="py-3 px-4 text-left">Total</th>
            <th className="py-3 px-4 text-center">Act</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {signals.map((signal, index) => {
            const capitalTrend = signal.capitalTrend || createDefaultTrend();
            const communityTrend = signal.communityTrend || createDefaultTrend();
            const chartData = metricLens === 'capital' ? capitalTrend.chartData : communityTrend.chartData;
            const velocity = metricLens === 'capital' ? capitalTrend.velocity : communityTrend.velocity;

            return (
              <tr key={signal.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                <td className="py-4 px-4 text-gray-400">{index + 1}</td>
                <td className="py-4 px-4 max-w-xs xl:max-w-md">
                  <div className="flex items-center gap-3">
                    <img 
                      src={signal.image || `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIGZpbGw9IiMyZDM3NDgiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIC8+PC9zdmc+`} 
                      alt={signal.label || signal.id}
                      className="w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="font-semibold text-white truncate" title={signal.label || signal.id}>
                        {signal.label || signal.id.slice(0, 12) + '...'}
                      </div>
                      <a
                        href={`${portalBaseUrl}${signal.id}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate transition-colors"
                        title={`View signal ${signal.id} on Intuition Portal`}
                      >
                        {signal.id}
                      </a>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {chartData && chartData.labels.length > 1 ? (
                    <SparklineChart data={chartData} velocity={velocity} />
                  ) : <div className='w-24 h-8'/>}
                </td>
                <td className={`py-4 px-4 font-bold ${capitalTrend.recentCapital > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                  +{formatNumber(capitalTrend.recentCapital)}
                  <span className="text-gray-400 font-normal"> $TRUST</span>
                   <div className={`text-xs font-normal ${capitalTrend.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({capitalTrend.percentageChange >= 0 ? '+' : ''}{capitalTrend.percentageChange.toFixed(1)}%)
                  </div>
                </td>
                <td className={`py-4 px-4 font-bold text-lg ${communityTrend.recentStakers > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  +{communityTrend.recentStakers.toLocaleString()}
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-white">
                    {metricLens === 'capital' ? formatNumber(ethers.utils.formatEther(signal.totalStaked || '0')) : (signal.totalStakers || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">{metricLens === 'capital' ? '$TRUST' : 'Stakers'}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-center">
                     <StakeActions signalId={signal.id} provider={provider} />
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