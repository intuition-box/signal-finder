// src/components/SignalCard.jsx
import React, { useState } from 'react';
import { useAtomStaking } from '../hooks/useAtomStaking';
import { LENS_CONFIGS } from '../config/intuition';
import AtomStakingModal from './AtomStakingModal';
import './SignalCard.css';

const SignalCard = ({ signal, lens = 'HEAVYWEIGHT', filter = 'BY_CAPITAL' }) => {
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [stakeAction, setStakeAction] = useState('STAKE');
  
  const {
    isConnected,
    executeStake,
    executeUnstake,
    isLoading,
  } = useAtomStaking();

  const handleQuickStake = async () => {
    if (!isConnected) {
      setShowStakingModal(true);
      return;
    }
    
    try {
      const lensConfig = LENS_CONFIGS[lens];
      await executeStake(signal, lensConfig.suggestedStake, lens, filter);
    } catch (error) {
      console.error('Quick stake failed:', error);
    }
  };

  const handleStakeClick = () => {
    setStakeAction('STAKE');
    setShowStakingModal(true);
  };

  const handleUnstakeClick = () => {
    setStakeAction('UNSTAKE');
    setShowStakingModal(true);
  };

  return (
    <div className="signal-card">
      <div className="signal-header">
        <div className="signal-identity">
          {signal.image && (
            <img src={signal.image} alt="" className="signal-avatar" />
          )}
          <div className="signal-info">
            <div className="signal-label">
              {signal.emoji && <span className="signal-emoji">{signal.emoji}</span>}
              {signal.label || signal.id?.slice(0, 12) + '...'}
            </div>
            <div className="signal-id">{signal.id?.slice(0, 12)}...</div>
          </div>
        </div>
      </div>

      <div className="signal-actions">
        <button 
          className="stake-btn primary"
          onClick={handleQuickStake}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Processing...' : '🎯 Quick Stake'}
        </button>
        
        <button 
          className="stake-btn secondary"
          onClick={handleStakeClick}
          disabled={isLoading}
        >
          ⚙️ Custom Stake
        </button>
        
        <button 
          className="unstake-btn"
          onClick={handleUnstakeClick}
          disabled={isLoading}
        >
          📤 Unstake
        </button>
      </div>

      <AtomStakingModal 
        atom={signal}
        isOpen={showStakingModal}
        onClose={() => setShowStakingModal(false)}
        action={stakeAction}
        lens={lens}
        filter={filter}
      />
    </div>
  );
};

export default SignalCard;