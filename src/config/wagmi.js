// src/config/wagmi.js
import { createConfig, http } from 'wagmi';
import { mainnet, base } from 'wagmi/chains';
import { INTUITION_TESTNET } from './intuition';

export const config = createConfig({
  chains: [mainnet, base, INTUITION_TESTNET],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [INTUITION_TESTNET.id]: http('https://testnet.rpc.intuition.systems/http'),
  },
});