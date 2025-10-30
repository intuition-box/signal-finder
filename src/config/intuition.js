// src/config/intuition.js
export const INTUITION_TESTNET = {
  id: 13579,
  name: 'Intuition Testnet',
  network: 'intuition-testnet',
  nativeCurrency: { name: 'tTRUST', symbol: 'tTRUST', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.rpc.intuition.systems/http'] },
  },
  blockExplorers: {
    default: { name: 'Intuition Explorer', url: 'https://testnet.explorer.intuition.systems' },
  },
  testnet: true,
};

export const INTUITION_CONTRACTS = {
  TRUST_TOKEN: '0x...', // From your deployment
  MULTIVAULT: '0x...', // From your deployment
  ATOM_WALLET_FACTORY: '0x...', // From your deployment
};

export const MULTIVAULT_ABI = [
  'function depositAtom(uint256 vaultId, uint256 atomId, uint256 atomDepositAmount) external payable',
  'function redeemAtom(uint256 vaultId, uint256 atomId, uint256 atomBurnAmount) external',
  'function getAtomCost(uint256 atomId) external view returns (uint256)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

export const LENS_CONFIGS = {
  HEAVYWEIGHT: { suggestedStake: '1.0', minStake: '0.1', maxStake: '100', color: '#f59e0b', icon: '🏗️' },
  TRENDING: { suggestedStake: '0.1', minStake: '0.01', maxStake: '10', color: '#10b981', icon: '📈' },
  EMERGING: { suggestedStake: '0.01', minStake: '0.001', maxStake: '1', color: '#8b5cf6', icon: '🌱' },
};