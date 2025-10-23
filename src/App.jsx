// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added React import
import { processSignalData } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';
// Assuming WalletConnect is imported from its own file now
// import { WalletConnect } from './components/WalletConnect.jsx'; 
// Assuming NetworkStatus is imported from its own file now
// import { NetworkStatus } from './components/NetworkStatus.jsx'; 
import { ethers } from 'ethers';

const GRAPH_URL = import.meta.env.VITE_API_ENDPOINT || "https://testnet.intuition.sh/v1/graphql";

// Query 1: Fetches the list of terms sorted by market cap
const GET_TERMS_LIST = `
  query GetTermsList {
    terms(limit: 10, order_by: {total_market_cap: desc}) {
      id
      total_market_cap
      atom {
        label
        image
      }
      positions_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

// Query 2: Fetches positions history for a term
const GET_POSITIONS_HISTORY = `
  query GetPositionsHistory($termId: String!) {
    term(id: $termId) {
      positions(order_by: {created_at: asc}, limit: 100) {
        account_id
        shares
        created_at
      }
    }
  }
`;

// --- Re-usable Components ---
// Assume WalletConnect is imported or defined if needed
const WalletConnect = ({ account, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const handleConnect = async () => {
    setIsConnecting(true);
    try { await onConnect(); }
    finally { setIsConnecting(false); }
  };
  return account ? (
    <div className="px-4 py-2 bg-gray-800 text-green-400 rounded-md font-mono text-sm">{`${account.slice(0, 6)}...${account.slice(-4)}`}</div>
  ) : (
    <button onClick={handleConnect} disabled={isConnecting} className={`px-4 py-2 ${isConnecting ? 'bg-blue-600/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} rounded-md font-semibold text-white`}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
// Assume NetworkStatus is imported or defined if needed
// const NetworkStatus = ({ wsStatus, blockNumber }) => { /* ... definition ... */ };


function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [timeframe, setTimeframe] = useState('hourly'); // Keep for analysis consistency
  const [error, setError] = useState(null);
  // WebSocket state can be added back later if needed

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
    try { // CORRECTED: try block wraps the entire fetch sequence
      const listResponse = await fetch(GRAPH_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_TERMS_LIST })
      });
      const listData = await listResponse.json();
      console.log("Raw Terms List Response:", listData); // Debug log
      if (listData.errors) throw new Error(`GraphQL Error (List): ${JSON.stringify(listData.errors)}`);

      const baseTerms = listData.data?.terms;
      if (!baseTerms || baseTerms.length === 0) {
        setSignals([]);
        console.warn("No terms found matching the query.");
        return; 
      }

      // Limit client-side if needed (API already limits to 10)
      const limitedTerms = baseTerms; // Use all 10 fetched

      const historyPromises = limitedTerms.map(term =>
        fetch(GRAPH_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_POSITIONS_HISTORY, variables: { termId: term.id } })
        }).then(res => res.json())
      );
      const historyResults = await Promise.all(historyPromises);

      const enrichedTerms = limitedTerms.map((term, index) => {
        const historyData = historyResults[index];
        if (historyData.errors) {
          console.error(`Error fetching history for ${term.id}:`, historyData.errors);
        }
        console.log(`History Data for ${term.id}:`, historyData?.data?.term); // Debug log

        // CORRECTED: Attach 'positions' data correctly
        return {
          ...term,
          positions: historyData?.data?.term?.positions || []
        };
      });

      // CORRECTED: Process signals AFTER the loop
      const processedSignals = processSignalData(enrichedTerms, timeframe);
      setSignals(processedSignals);

    } catch (err) { // CORRECTED: catch block placement
      console.error('Error fetching comprehensive signal data:', err);
      setError(err.message);
    } finally { // CORRECTED: finally block placement
      setLoading(false);
    }
  }, [timeframe]); // fetch depends on timeframe if analysis uses it

  useEffect(() => {
    fetchAllSignalData();
  }, [fetchAllSignalData]);

  const sortedSignals = useMemo(() => {
    const newSignals = [...signals];
    const trendType = metricLens === 'capital' ? 'capitalTrend' : 'communityTrend';
    switch (sortLens) {
      case 'emerging':
        return newSignals.sort((a, b) => (b[trendType]?.acceleration || -Infinity) - (a[trendType]?.acceleration || -Infinity));
      case 'trending':
        return newSignals.sort((a, b) => (b[trendType]?.velocity || -Infinity) - (a[trendType]?.velocity || -Infinity));
      case 'heavyweight':
      default:
        const sortKey = metricLens === 'capital' ? 'totalStaked' : 'totalStakers';
        return newSignals.sort((a, b) => parseFloat(b[sortKey] || 0) - parseFloat(a[sortKey] || 0));
    }
  }, [signals, metricLens, sortLens]);

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Intuition Protocol Signal Finder</h1>
            <WalletConnect account={account} onConnect={connectWallet} />
             {/* Include NetworkStatus here if you have it */}
             {/* <NetworkStatus wsStatus={wsStatus} blockNumber={blockNumber} /> */}
          </div>
          <p className="text-gray-400">Tracking live staking velocity to find signals of emerging trust.</p>
        </header>
        <main>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Control buttons remain the same */}
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
          {/* CORRECTED Conditional Rendering */}
          {loading ? (
            <div className="text-center py-10 text-gray-400">Loading signals...</div> 
          ) : error ? (
            <div className="text-center py-10 text-red-400">{error}</div> 
          ) : signals.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <h2>No signals found on the testnet.</h2>
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