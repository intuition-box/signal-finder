import React, { useState } from 'react';

export const StakeActions = ({ signalId, provider, disabled }) => {
  const [isStaking, setIsStaking] = useState(false);

  const handleStake = async () => {
    if (!provider || disabled || isStaking) return;
    
    setIsStaking(true);
    try {
      // Add your staking logic here
      console.log('Staking for signal:', signalId);
    } catch (error) {
      console.error('Staking error:', error);
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <button
      onClick={handleStake}
      disabled={!provider || disabled || isStaking}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200
        ${!provider ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
          disabled || isStaking ? 'bg-blue-600/50 text-blue-300 cursor-not-allowed' :
          'bg-blue-600 text-white hover:bg-blue-700'}`}
    >
      {isStaking ? 'Staking...' : 'Stake'}
    </button>
  );
};