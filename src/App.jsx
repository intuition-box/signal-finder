// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processSignalData, createDefaultTrend } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';
import { ethers } from 'ethers';

const GRAPH_URL = import.meta.env.VITE_API_ENDPOINT || "/graphql";

// Query 1: Fetches the 10 *most valuable* terms (for Heavyweights)
const GET_HEAVYWEIGHT_TERMS = `
  query GetHeavyweightTerms {
    terms(limit: 10, order_by: {total_market_cap: desc}) {
      id
      total_market_cap
      atom { label image }
      positions_aggregate { aggregate { count } }
      positions(order_by: {created_at: asc}, limit: 1000) {
        account_id
        shares
        created_at
      }
    }
  }
`;

// Query 2: Fetches the 100 *most recently active* terms (for Trending/Emerging)
const GET_ACTIVE_TERMS = `
  query GetActiveTerms {
    terms(limit: 100, order_by: {updated_at: desc}) {
      id
      updated_at
      total_market_cap
      atom { label image }
      positions_aggregate { aggregate { count } }
      positions(order_by: {created_at: asc}, limit: 1000) {
        account_id
        shares
        created_at
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

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [error, setError] = useState(null);

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
      const query = sortLens === 'heavyweight' ? GET_HEAVYWEIGHT_TERMS : GET_ACTIVE_TERMS;

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
  }, [sortLens]); // Re-fetch when sortLens changes

  useEffect(() => {
    fetchAllSignalData();
  }, [fetchAllSignalData]);

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
        filteredSignals = signalsWithData.filter(s => s[totalKey] < threshold);
        sortedList = filteredSignals.sort((a, b) => b[trendType].acceleration - a[trendType].acceleration);
        break;
      case 'trending':
        filteredSignals = signalsWithData.filter(s => s[totalKey] < threshold);
        sortedList = filteredSignals.sort((a, b) => b[trendType].velocity - a[trendType].velocity);
        break;
      case 'heavyweight':
      default:
        sortedList = signalsWithData.sort((a, b) => b.numericTotal - a.numericTotal);
        break;
    }
    
    return sortedList.slice(0, 10);
    
  }, [signals, metricLens, sortLens]);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Intuition Protocol Signal Finder</h1>
            <WalletConnect account={account} onConnect={connectWallet} />
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
              refreshData={fetchAllSignalData} // Pass the refresh function
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;