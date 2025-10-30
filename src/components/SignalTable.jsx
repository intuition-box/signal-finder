// src/components/SignalTable.jsx
import React from 'react';
import { ethers } from 'ethers';
import { useState } from 'react';
import { SparklineChart } from './SparklineChart.jsx';
import { formatNumber } from '../utils/format.js';
import { createDefaultTrend } from '../utils/analysis.js';

// --- NEW ABI and Contract ---
// We now use the MultiVault ABI, not a custom one
const INTUITION_MULTIVAULT_ADDRESS = "0xB92EA1B47E4ABD0a520E9138BB59dBd1bC6C475B";
const INTUITION_MULTIVAULT_ABI = [
  // The functions we need: deposit and redeem
  "function deposit(address receiver, bytes32 termId, uint256 curveId, uint256 minShares) external payable returns (uint256)",
  "function redeem(address receiver, bytes32 termId, uint256 curveId, uint256 shares, uint256 minAssets) external returns (uint256)"
];

const StakeActions = ({ signalId, provider, refreshData }) => {
  const [amount, setAmount] = useState('0.1');
  const [isLoading, setIsLoading] = useState(false);

  // --- NEW: handleStake calls deposit() ---
  const handleStake = async () => {
    if (!provider || !provider.getSigner) return alert('Please connect a valid wallet first.');
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount.');
    
    setIsLoading(true);
    try {
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const intuitionContract = new ethers.Contract(INTUITION_MULTIVAULT_ADDRESS, INTUITION_MULTIVAULT_ABI, signer);
      const amountWei = ethers.utils.parseEther(amount);

      // Call deposit. We send $tTRUST as msg.value
      // We use curveId 1 (support) and set minShares to 0 for simplicity
      const depositTx = await intuitionContract.deposit(userAddress, signalId, 1, 0, {
        value: amountWei
      });

      await depositTx.wait(); // Wait for confirmation
      
      alert('Staking successful!');
      if (refreshData) refreshData();

    } catch (error) {
      console.error('Staking failed:', error);
      alert('Staking failed. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: handleUnstake calls redeem() ---
  // Note: Redeeming requires knowing your *share* balance, not $TRUST amount.
  // This is a simplified "unstake" that redeems a fixed number of shares.
  const handleUnstake = async () => {
     alert('Unstaking (redeeming) requires a more complex calculation to determine your share amount. This feature is a work in progress!');
     // In a real app, you would first query `getShares(userAddress, signalId, 1)`
     // For now, we don't execute the transaction.
     return; 

    /*
    setIsLoading(true);
    try {
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const intuitionContract = new ethers.Contract(INTUITION_MULTIVAULT_ADDRESS, INTUITION_MULTIVAULT_ABI, signer);
      
      // TODO: This is a placeholder. We need to redeem a specific amount of *SHARES*.
      const sharesToRedeem = ethers.utils.parseEther('0.1'); // This is NOT correct, just a placeholder
      
      const redeemTx = await intuitionContract.redeem(userAddress, signalId, 1, sharesToRedeem, 0);
      await redeemTx.wait();

      alert('Unstaking successful!');
      if (refreshData) refreshData();

    } catch (error) {
      console.error('Unstaking failed:', error);
      alert('Unstaking failed. See console for details.');
    } finally {
      setIsLoading(false);
    }
    */
  };

  return (
    <div className="flex items-center gap-2">
       <input 
        type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
        className="w-20 bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
        step="0.1" min="0" placeholder="0.0" disabled={isLoading}
      />
      {/* --- NEW: Renamed Buttons --- */}
      <button onClick={handleStake} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'Stake'}</button>
      <button onClick={handleUnstake} disabled={isLoading} className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded-md disabled:opacity-50">Unstake</button>
    </div>
  );
};

export const SignalTable = ({ signals, provider, metricLens, refreshData }) => {
  const portalBaseUrl = "https://portal.intuition.systems/explore/atom/";

  if (!signals || signals.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <h2>No signals found matching the current criteria.</h2>
      </div>
    );
  }

  // Helper to convert IPFS links
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
            <th className="py-3 px-4 text-left">Trend</th>
            <th className="py-3 px-4 text-left">Velocity (% Change)</th>
            <th className="py-3 px-4 text-left">Acceleration</th>
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

            return (
              <tr key={signal.id} className="hover:bg-gray-800/50 transition-colors duration-200">
                <td className="py-4 px-4 text-gray-400">{index + 1}</td>
                <td className="py-4 px-4 max-w-xs xl:max-w-md">
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
                <td className="py-4 px-4">
                  <div className="font-bold text-white">
                    {/* *** THE CRASH FIX *** */}
                    {metricLens === 'capital' 
                      ? formatNumber(ethers.utils.formatEther(signal.totalStaked || '0')) 
                      : formatNumber(signal.totalStakers || 0)}
                  </div>
                  <div className="text-xs text-gray-400">{metricLens === 'capital' ? '$TRUST' : 'Stakers'}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-center">
                     <StakeActions signalId={signal.id} provider={provider} refreshData={refreshData} />
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