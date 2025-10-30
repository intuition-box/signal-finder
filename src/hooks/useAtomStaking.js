// src/hooks/useAtomStaking.js
import { useState } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { INTUITION_CONTRACTS, MULTIVAULT_ABI, LENS_CONFIGS } from '../config/intuition';

export const useAtomStaking = () => {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  const [selectedAtom, setSelectedAtom] = useState(null);

  const { data: trustBalance, refetch: refetchBalance } = useContractRead({
    address: INTUITION_CONTRACTS.TRUST_TOKEN,
    abi: ['function balanceOf(address) external view returns (uint256)'],
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
    chainId: 13579,
  });

  const { data: stakeData, write: stakeAtom } = useContractWrite({
    address: INTUITION_CONTRACTS.MULTIVAULT,
    abi: MULTIVAULT_ABI,
    functionName: 'depositAtom',
    chainId: 13579,
  });

  const { isLoading: isStaking } = useWaitForTransaction({
    hash: stakeData?.hash,
    chainId: 13579,
    onSuccess: () => {
      console.log('✅ Staking successful!');
      refetchBalance();
      setStakeAmount('');
    },
  });

  const executeStake = async (atom, amount, lens) => {
    if (!atom || !amount) return;
    
    try {
      stakeAtom({
        args: [1, atom.term_id, parseEther(amount)],
      });
    } catch (error) {
      console.error('❌ Staking failed:', error);
    }
  };

  return {
    isConnected,
    trustBalance: trustBalance ? formatEther(trustBalance) : '0',
    executeStake,
    isStaking,
    stakeAmount,
    setStakeAmount,
    selectedAtom,
    setSelectedAtom,
  };
};