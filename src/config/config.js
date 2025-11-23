// src/config.js

// ------------------------------------------------------------------
// 🌍 ENVIRONMENT SWITCH
// Set this to TRUE for Mainnet, FALSE for Testnet
// ------------------------------------------------------------------
export const IS_MAINNET = true; 

// --- CONSTANTS ---

// 1. Network Details
// Base Mainnet: 8453 | Intuition Testnet: 13579 (or Base Sepolia 84532)
export const CHAIN_ID = IS_MAINNET ? 8453 : 13579; 
export const NETWORK_NAME = IS_MAINNET ? "Base Mainnet" : "Intuition Testnet";

// 2. Contract Addresses
// Mainnet address from your snippet vs Testnet address
export const MULTIVAULT_ADDRESS = IS_MAINNET 
  ? "0x2Ece8D4dEdcB9918A398528f3fa4688b1d2CAB91" 
  : "0xB92EA1B47E4ABD0a520E9138BB59dBd1bC6C475B";

// 3. Data API Endpoints
export const GRAPH_URL = IS_MAINNET 
  ? "https://mainnet.intuition.sh/v1/graphql" 
  : "https://testnet.intuition.sh/v1/graphql";

// WebSocket URL (auto-switches protocol)
export const WSS_URL = IS_MAINNET
  ? "wss://mainnet.intuition.sh/v1/graphql"
  : "wss://testnet.intuition.sh/v1/graphql";

// 4. Portal URLs
export const PORTAL_BASE_URL = IS_MAINNET
  ? "https://portal.intuition.systems/explore/atom/"
  : "https://testnet.portal.intuition.systems/explore/atom/";