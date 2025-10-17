// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processSignalData } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';
import { ethers } from 'ethers';

const GRAPH_URL = import.meta.env.VITE_API_ENDPOINT || "https://testnet.intuition.sh/v1/graphql";
const WSS_URL = import.meta.env.VITE_WS_ENDPOINT || "wss://testnet.intuition.sh/v1/graphql";

const GET_TERMS_LIST = `
  query GetTermsList {
    terms(limit: 10) {
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

const createVaultHistoryQuery = (timeframe) => {
  const statsField = `share_price_change_stats_${timeframe}`;
  return `
    query GetVaultHistory($termId: String!) {
      term(id: $termId) {
        vaults(order_by: {curve_id: asc}) {
          curve_id
          ${statsField}(order_by: {bucket: asc}, limit: 100) {
            bucket
            last_share_price
          }
        }
      }
    }
  `;
};

const WalletConnect = ({ account, onConnect }) => {
  return account ? (
    <div className="px-4 py-2 bg-gray-800 text-green-400 rounded-md font-mono text-sm">{`${account.slice(0, 6)}...${account.slice(-4)}`}</div>
  ) : (
    <button onClick={onConnect} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold text-white">Connect Wallet</button>
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

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [timeframe, setTimeframe] = useState('hourly');
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
        setError('Failed to connect wallet. See console for details.');
      }
    } else {
        setError('Please install a web3 wallet like MetaMask.');
    }
  };

  const fetchAllSignalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const GET_VAULT_HISTORY = createVaultHistoryQuery(timeframe);
      const listResponse = await fetch(GRAPH_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_TERMS_LIST })
      });
      const listData = await listResponse.json();
      if (listData.errors) throw new Error(`GraphQL Error (List): ${JSON.stringify(listData.errors)}`);
      
      const baseTerms = listData.data?.terms;
      if (!baseTerms) throw new Error("No terms found in API response.");

      const historyPromises = baseTerms.map(term =>
        fetch(GRAPH_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_VAULT_HISTORY, variables: { termId: term.id } })
        }).then(res => res.json())
      );
      const historyResults = await Promise.all(historyPromises);

      const enrichedTerms = baseTerms.map((term, index) => {
        const historyData = historyResults[index];
        if (historyData.errors) console.error(`Error fetching history for ${term.id}:`, historyData.errors);
        return { ...term, vaults: historyData?.data?.term?.vaults || [] };
      });
      const processedSignals = processSignalData(enrichedTerms, timeframe);
      setSignals(processedSignals);
    } catch (err) {
      console.error('Error fetching comprehensive signal data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAllSignalData();
  }, [fetchAllSignalData]);

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    const setupWebSocket = () => {
      ws = new WebSocket(WSS_URL, 'graphql-ws');
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
  }, []);

  const sortedSignals = useMemo(() => {
    const newSignals = [...signals];
    const trendType = metricLens === 'capital' ? 'capitalTrend' : 'communityTrend';
    switch (sortLens) {
      case 'emerging':
        return newSignals.sort((a, b) => (b[trendType]?.acceleration || 0) - (a[trendType]?.acceleration || 0));
      case 'trending':
        return newSignals.sort((a, b) => (b[trendType]?.velocity || 0) - (a[trendType]?.velocity || 0));
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
            <div className="text-center py-10">Loading...</div>
          ) : error ? (
            <div className="text-red-400 text-center py-10">{error}</div>
          ) : (
            <SignalTable signals={sortedSignals} provider={provider} metricLens={metricLens} />
          )}
        </main>
      </div>
    </div>
  );
}