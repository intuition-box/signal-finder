// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processSignalData, createDefaultTrend } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';
import { ethers } from 'ethers';
import { LiveActivityFeed } from './components/LiveActivityFeed.jsx';
// 🌍 Import Config
import { GRAPH_URL, WSS_URL, CHAIN_ID, NETWORK_NAME } from './config/config.js';

// Query 1: Heavyweights (Top by Market Cap)
const GET_HEAVYWEIGHT_TERMS = `
  query GetHeavyweightTerms {
    terms(limit: 10, order_by: {total_market_cap: desc}) {
      id
      type 
      total_market_cap
      atom { label image }
      positions_aggregate { aggregate { count } }
      positions(order_by: {created_at: asc}, limit: 1000) {
        account_id
        shares
        created_at
      }
      triple {
        subject { term_id label }
        predicate { term_id label }
        object { term_id label }
      }
    }
  }
`;

// Query 2: Active (Most recent activity)
const GET_ACTIVE_TERMS = `
  query GetActiveTerms {
    terms(limit: 100, order_by: {updated_at: desc}) {
      id
      type
      updated_at
      total_market_cap
      atom { label image }
      positions_aggregate { aggregate { count } }
      positions(order_by: {created_at: asc}, limit: 1000) {
        account_id
        shares
        created_at
      }
      triple {
        subject { term_id label }
        predicate { term_id label }
        object { term_id label }
      }
    }
  }
`;

const WalletConnect = ({ account, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const handleConnect = async () => {
    setIsConnecting(true);
    try { await onConnect(); } finally { setIsConnecting(false); }
  };
  return account ? (
    <div className="px-4 py-2 bg-gray-800 text-green-400 rounded-md font-mono text-sm">{`${account.slice(0, 6)}...${account.slice(-4)}`}</div>
  ) : (
    <button onClick={handleConnect} disabled={isConnecting} className={`px-4 py-2 ${isConnecting ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} rounded-md font-semibold text-white`}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};

// Re-added NetworkStatus
const NetworkStatus = ({ wsStatus, blockNumber }) => {
    const getStatusColor = () => {
        switch(wsStatus) {
            case 'connected': return 'bg-green-500';
            case 'connecting': return 'bg-yellow-500';
            default: return 'bg-red-500';
        }
    };
    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2" title={`WebSocket Status: ${wsStatus}`}>
                <div className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'animate-pulse' : ''} ${getStatusColor()}`} />
                <span className="text-sm text-gray-400">LIVE</span>
            </div>
            {blockNumber && (
                <div className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-md">
                    <span className="text-sm text-green-400 font-mono">{blockNumber}</span>
                </div>
            )}
        </div>
    );
};

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [error, setError] = useState(null);
  const [newClaim, setNewClaim] = useState(null); 
  const [wsStatus, setWsStatus] = useState('connecting');
  const [blockNumber, setBlockNumber] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const { chainId } = await web3Provider.getNetwork();
      
      // ⚡ Force Mainnet Switch
      if (chainId !== CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ethers.utils.hexValue(CHAIN_ID) }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
             alert(`Please add ${NETWORK_NAME} (Chain ID: ${CHAIN_ID}) to your wallet.`);
          }
          return;
        }
      }

      await web3Provider.send("eth_requestAccounts", []);
      const signer = web3Provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      setProvider(web3Provider);
    } else { setError('Please install MetaMask.'); }
  };

  const fetchAllSignalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = sortLens === 'heavyweight' ? GET_HEAVYWEIGHT_TERMS : GET_ACTIVE_TERMS;

      // Note: We use the full URL from config, bypassing the proxy to ensure mainnet connectivity
      const listResponse = await fetch(GRAPH_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const listData = await listResponse.json();
      if (listData.errors) throw new Error(`GraphQL Error: ${JSON.stringify(listData.errors)}`);
      
      const baseTerms = listData.data?.terms;
      if (!baseTerms || baseTerms.length === 0) {
        setSignals([]);
        console.warn("No terms found matching the query.");
        return;
      }
      
      const processedSignals = processSignalData(baseTerms);
      setSignals(processedSignals);

    } catch (err) {
      console.error('Error fetching comprehensive signal data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sortLens]);

  useEffect(() => {
    fetchAllSignalData();
  }, [fetchAllSignalData]);

  // --- WebSocket logic ---
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    const setupWebSocket = () => {
      // Use full WSS URL from config
      ws = new WebSocket(WSS_URL, 'graphql-ws');
      setWsStatus('connecting');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connection_ack') {
          setWsStatus('connected');
          ws.send(JSON.stringify({
            id: 'claims-sub',
            type: 'start',
            payload: { query: `subscription NewClaimsSubscription { newTriples(limit: 1, order_by: { created_at: desc }) { id type subject { label } predicate { label } object { label } } }` }
          }));
          ws.send(JSON.stringify({
            id: 'atoms-sub',
            type: 'start',
            payload: { query: `subscription NewAtomsSubscription { atoms(limit: 1, order_by: { created_at: desc }) { id type created_at label image } }` }
          }));
        }
        
        if (data.type === 'data' && data.payload?.data) {
          const payload = data.payload.data;
          if (payload.newTriples) {
             const triple = payload.newTriples[0];
             setNewClaim({ id: triple.id, type: triple.type, created_at: triple.created_at, atom: null, triple: triple });
          } else if (payload.atoms) {
             const atom = payload.atoms[0];
             setNewClaim({ id: atom.id, type: atom.type, created_at: atom.created_at, atom: atom, triple: null });
          }
        }
      };
      ws.onerror = (err) => { console.error("WebSocket Error:", err); setWsStatus('error'); };
      ws.onclose = () => {
        setWsStatus('disconnected');
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(setupWebSocket, 5000);
      };
    };
    setupWebSocket();
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // --- Sorting Logic ---
  const sortedSignals = useMemo(() => {
    const HEAVYWEIGHT_MIN_CAPITAL = 1000;
    const HEAVYWEIGHT_MIN_COMMUNITY = 500;

    const signalsWithData = signals.map(s => {
      let numericCapitalTotal = 0;
      let numericCommunityTotal = s.totalStakers || 0;
      try { numericCapitalTotal = parseFloat(ethers.utils.formatEther(s.totalStaked || '0')); } catch {}
      
      return {
        ...s,
        numericCapitalTotal, 
        numericCommunityTotal,
        capitalTrend: s.capitalTrend || createDefaultTrend(),
        communityTrend: s.communityTrend || createDefaultTrend()
      };
    });

    const trendType = metricLens === 'capital' ? 'capitalTrend' : 'communityTrend';
    const totalKey = metricLens === 'capital' ? 'numericCapitalTotal' : 'numericCommunityTotal';
    const threshold = metricLens ==='capital' ? HEAVYWEIGHT_MIN_CAPITAL : HEAVYWEIGHT_MIN_COMMUNITY;

    let sortedList;
    switch (sortLens) {
      case 'emerging':
        sortedList = signalsWithData
          .filter(s => s[totalKey] < threshold)
          .sort((a, b) => b[trendType].acceleration - a[trendType].acceleration);
        break;
      case 'trending':
        sortedList = signalsWithData
          .filter(s => s[totalKey] < threshold)
          .sort((a, b) => b[trendType].velocity - a[trendType].velocity);
        break;
      case 'heavyweight':
      default:
        sortedList = signalsWithData.sort((a, b) => b[totalKey] - a[totalKey]);
        break;
    }
    return sortedList.slice(0, 10);
  }, [signals, metricLens, sortLens]);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-full px-4 lg:px-8 mx-auto"> 
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Intuition Protocol Signal Finder</h1>
            <div className="flex items-center gap-4">
              <NetworkStatus wsStatus={wsStatus} blockNumber={blockNumber} />
              <WalletConnect account={account} onConnect={connectWallet} />
            </div>
          </div>
          <p className="text-gray-400">Tracking live staking velocity to find signals of emerging trust.</p>
        </header>
        <main>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2 p-1 bg-gray-900 rounded-md">
                <button onClick={() => setMetricLens('capital')} className={`px-3 py-1 rounded text-sm font-medium ${metricLens === 'capital' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>By Capital ($)</button>
                <button onClick={() => setMetricLens('community')} className={`px-3 py-1 rounded text-sm font-medium ${metricLens === 'community' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>By Community (#)</button>
            </div>
            <div className="w-px h-6 bg-gray-700"></div>
            <div className="flex items-center gap-2">
                <button onClick={() => setSortLens('heavyweight')} className={`px-4 py-2 rounded-md font-medium text-sm ${sortLens === 'heavyweight' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Heavyweights</button>
                <button onClick={() => setSortLens('trending')} className={`px-4 py-2 rounded-md font-medium text-sm ${sortLens === 'trending' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Trending</button>
                <button onClick={() => setSortLens('emerging')} className={`px-4 py-2 rounded-md font-medium text-sm ${sortLens === 'emerging' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>Emerging</button>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/4 lg:max-w-sm flex-shrink-0">
              <LiveActivityFeed 
                newClaim={newClaim} 
                provider={provider}
                refreshData={fetchAllSignalData} 
              />
            </div>
            <div className="lg:flex-1">
              {loading ? (
                <div className="text-center py-10">Loading signals...</div>
              ) : error ? (
                <div className="text-red-400 text-center py-10">{error.message}</div>
              ) : sortedSignals.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <h2>No signals found matching the current criteria.</h2>
                </div>
              ) : (
                <SignalTable
                  signals={sortedSignals}
                  provider={provider}
                  metricLens={metricLens}
                  sortLens={sortLens}
                  refreshData={fetchAllSignalData} 
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;