// src/App.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { processSignalData } from './utils/analysis.js';
import { SignalTable } from './components/SignalTable.jsx';

const GRAPH_URL ="https://testnet.intuition.sh/v1/graphql";

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

const GET_ATOMS_LIST = `
  query GetAtomsList($limit: Int!) {
    atoms(limit: $limit, order_by: {created_at: desc}) {
      term_id
      label
      image
      term {
        vaults(order_by: {curve_id: asc}) {
          curve_id
          position_count
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

function App() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metricLens, setMetricLens] = useState('capital');
  const [sortLens, setSortLens] = useState('heavyweight');
  const [timeframe, setTimeframe] = useState('hourly');
  const [error, setError] = useState(null);

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

      let baseTerms = listData.data?.terms;
      if (!baseTerms || baseTerms.length === 0) {
        const atomsResponse = await fetch(GRAPH_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_ATOMS_LIST, variables: { limit: 10 } })
        });
        const atomsData = await atomsResponse.json();
        if (atomsData.errors) throw new Error(`GraphQL Error (Atoms): ${JSON.stringify(atomsData.errors)}`);
        const atoms = atomsData.data?.atoms || [];
        baseTerms = atoms.map(a => ({
          id: a.term_id,
          total_market_cap: '0',
          atom: { label: a.label, image: a.image },
          positions_aggregate: { aggregate: { count: (a.term?.vaults || []).reduce((acc, v) => acc + (v.position_count || 0), 0) } },
        }));
        if (baseTerms.length === 0) throw new Error("No terms found in API response.");
      }

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
            <div />
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
            <SignalTable signals={sortedSignals} metricLens={metricLens} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;