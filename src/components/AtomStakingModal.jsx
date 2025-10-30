// src/components/AtomStakingModal.jsx
import React, { useState, useEffect } from 'react';
import { useAtomStaking } from '../hooks/useAtomStaking';
import './AtomStakingModal.css';

const AtomStakingModal = ({ atom, isOpen, onClose, lens = 'HEAVYWEIGHT' }) => {
  const [amount, setAmount] = useState('');
  const { executeStake, isStaking, trustBalance } = useAtomStaking();

  if (!isOpen || !atom) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await executeStake(atom, amount, lens);
    onClose();
  };

  return (
    <div className="staking-modal-overlay" onClick={onClose}>
      <div className="staking-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🎯 Stake on {atom.label}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="amount-section">
            <label>Amount (tTRUST):</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.001"
              step="0.001"
              min="0.001"
              required
            />
            <div className="balance-info">
              Balance: {parseFloat(trustBalance).toFixed(6)} tTRUST
            </div>
          </div>

          <button type="submit" disabled={isStaking || !amount} className="submit-btn">
            {isStaking ? '⏳ Staking...' : `🎯 Stake ${amount || '0'} tTRUST`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AtomStakingModal;