// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processSignalData } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';
import { ethers } from 'ethers';

// NEW: All traffic goes through our local proxy
const GRAPH_URL = "/graphql"; 
const WSS_URL = `wss://${window.location.host}/graphql`;

// Query 1: Fetches the 100 *most recently active* terms
const GET_TERMS_LIST = `
  query GetTermsList {
    terms(limit: 100, order_by: {updated_at: desc}) {
      id
      updated_at
      total_market_cap
      atom { label image }
      positions_aggregate { aggregate { count } }
    }
  }
`;

// Query 2: Fetches the raw position history
const GET_POSITIONS_HISTORY = `
  query GetPositionsHistory($termId: String!) {
    term(id: $termId) {
      positions(order_by: {created_at: asc}, limit: 1000) {
        account_id
        shares
        created_at
      }
    }
  }
`;

// --- UI Components ---
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

// --- Main App Component ---
function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [error, setError] = useState(null);
  const [wsStatus, setWsStatus] = useState('connecting');
  const [blockNumber, setBlockNumber] = useState(null);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        await web3Provider.send("eth_requestAccounts", []);
        const signer = web3Provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        setProvider(web3Provider);
      } catch (error) {
        console.error("Failed to connect wallet:", error);
        setError('Failed to connect wallet.');
      }
    } else { setError('Please install MetaMask.'); }
  };

  const fetchAllSignalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listResponse = await fetch(GRAPH_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_TERMS_LIST })
      });
      const listData = await listResponse.json();
      if (listData.errors) throw new Error(`GraphQL Error (List): ${JSON.stringify(listData.errors)}`);
      
      const baseTerms = listData.data?.terms;
      if (!baseTerms || baseTerms.length === 0) {
        setSignals([]);
        console.warn("No terms found matching the query.");
        return;
      }

      const historyPromises = baseTerms.map(term =>
        fetch(GRAPH_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_POSITIONS_HISTORY, variables: { termId: term.id } })
        }).then(res => res.json())
      );
      const historyResults = await Promise.all(historyPromises);

      const enrichedTerms = baseTerms.map((term, index) => {
        const historyData = historyResults[index];
        if (historyData.errors) console.error(`Error fetching history for ${term.id}:`, historyData.errors);
        return { ...term, positions: historyData?.data?.term?.positions || [] };
      });
      
      const processedSignals = processSignalData(enrichedTerms);
      setSignals(processedSignals);

    } catch (err) {
      console.error('Error fetching comprehensive signal data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => {
    fetchAllSignalData();
  }, [fetchAllSignalData]);

  // WebSocket useEffect
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    const setupWebSocket = () => {
      ws = new WebSocket(WSS_URL, 'graphql-ws'); // Use proxied URL
      setWsStatus('connecting');
      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
        ws.send(JSON.stringify({
          id: 'block-subscription',
          type: 'start',
          payload: { query: 'subscription { newBlocks { number } }' }
        }));
      };
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'data' && data.payload?.data?.newBlocks) {
          setBlockNumber(parseInt(data.payload.data.newBlocks.number, 16));
        }
      };
      ws.onerror = (err) => {
        console.error("WebSocket Error:", err);
        setWsStatus('error');
      };
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
  }, []); // Runs once on mount

  // --- Sorting Logic with Filters ---
  const sortedSignals = useMemo(() => {
    const HEAVYWEIGHT_MIN_CAPITAL = 1000;
    const HEAVYWEIGHT_MIN_COMMUNITY = 500;

    const signalsWithData = signals.map(s => {
      let numericTotal = 0;
      if (metricLens === 'capital') {
        try { numericTotal = parseFloat(ethers.utils.formatEther(s.totalStaked || '0')); } catch {}
      } else { numericTotal = s.totalStakers || 0; }
      
      return {
        ...s,
        numericTotal,
        capitalTrend: s.capitalTrend || createDefaultTrend(),
        communityTrend: s.communityTrend || createDefaultTrend()
      };
    });

    const trendType = metricLens === 'capital' ? 'capitalTrend' : 'communityTrend';
    const totalKey = metricLens === 'capital' ? 'numericTotal' : 'numericCommunityTotal';
    const threshold = metricLens === 'capital' ? HEAVYWEIGHT_MIN_CAPITAL : HEAVYWEIGHT_MIN_COMMUNITY;

    let filteredSignals;
    let sortedList;

    switch (sortLens) {
      case 'emerging':
        filteredSignals = signalsWithData.filter(s => s[totalKey] < threshold && s.communityTrend.recentStakers > 0);
        sortedList = filteredSignals.sort((a, b) => b.communityTrend.recentStakers - a.communityTrend.recentStakers);
        break;
      case 'trending':
        filteredSignals = signalsWithData.filter(s => s[totalKey] < threshold && s.capitalTrend.recentCapital > 0);
        sortedList = filteredSignals.sort((a, b) => b.capitalTrend.recentCapital - a.capitalTrend.recentCapital);
        break;
      case 'heavyweight':
      default:
        filteredSignals = signalsWithData.filter(s => s[totalKey] > 0);
        sortedList = filteredSignals.sort((a, b) => b[totalKey] - a[totalKey]);
        break;
    }
    
    return sortedList.slice(0, 10); // Show only the Top 10 from the sorted/filtered list
    
  }, [signals, metricLens, sortLens]);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
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
          {loading ? (
            <div className="text-center py-10">Loading signals...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-10">{error}</div>
          ) : sortedSignals.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <h2>No signals found matching the current criteria.</h2>
            </div>
          ) : (
            <SignalTable signals={sortedSignals} provider={provider} metricLens={metricLens} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;