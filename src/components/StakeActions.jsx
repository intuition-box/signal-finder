// src/components/StakeActions.jsx
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { MULTIVAULT_ADDRESS } from '../config/config.js';

// 👑 Updated ABI to support depositBatch
const INTUITION_MULTIVAULT_ABI = [
  "function deposit(address receiver, bytes32 termId, uint256 curveId, uint256 minShares) external payable returns (uint256)",
  "function depositBatch(address receiver, bytes32[] termIds, uint256[] curveIds, uint256[] assets, uint256[] minShares) external payable returns (uint256[])",
  "function redeem(address receiver, bytes32 termId, uint256 curveId, uint256 shares, uint256 minAssets) external returns (uint256)"
];

export const StakeActions = ({ signalId, provider, refreshData, type }) => {
  const [amount, setAmount] = useState('0.1');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async (curveId) => {
    if (!provider || !provider.getSigner) return alert('Please connect a valid wallet first.');
    if (!amount || parseFloat(amount) <= 0) return alert('Please enter a valid amount.');
    
    setIsLoading(true);
    try {
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();
      const intuitionContract = new ethers.Contract(MULTIVAULT_ADDRESS, INTUITION_MULTIVAULT_ABI, signer);
      const amountWei = ethers.utils.parseEther(amount);

      // 👑 MAINNET MIGRATION: Using depositBatch as per v2 standard
      // depositBatch(receiver, [termId], [curveId], [assets], [minShares])
      const tx = await intuitionContract.depositBatch(
        userAddress, 
        [signalId],        // Array of term IDs
        [curveId],         // Array of curve IDs (1 for Support, etc.)
        [amountWei],       // Array of asset amounts
        [0],               // Array of minShares (0 for now)
        { value: amountWei } // ⚡ CRITICAL: Sending ETH/TRUST as msg.value
      );
      
      await tx.wait(); // Wait for confirmation
      
      alert('Transaction successful!');
      if (refreshData) refreshData(); 

    } catch (error) {
      console.error('Transaction failed:', error);
      alert(`Transaction failed: ${error.message || error.reason || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUnstake = async (curveId) => {
     alert('Unstaking requires fetching your current share balance. This feature is coming soon.');
     // Requires reading 'getShares' first, which we will add in the next phase.
  };

  const isTriple = type === 'Triple' || type === 'CounterTriple';

  return (
    <div className="flex items-center gap-2">
       <input 
        type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
        className="w-20 bg-gray-900 border border-gray-700 rounded-md px-2 py-1 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
        step="0.1" min="0" placeholder="0.0" disabled={isLoading}
      />
      {isTriple ? (
        <>
          <button onClick={() => handleDeposit(1)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'Support'}</button>
          <button onClick={() => handleDeposit(2)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'Oppose'}</button>
        </>
      ) : (
        <>
          <button onClick={() => handleDeposit(1)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50">{isLoading ? '...' : 'Stake'}</button>
          <button onClick={() => handleUnstake(1)} disabled={isLoading || !amount} className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded-md disabled:opacity-50">Unstake</button>
        </>
      )}
    </div>
  );
};