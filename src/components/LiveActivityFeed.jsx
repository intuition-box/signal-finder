// src/components/LiveActivityFeed.jsx
import React, { useState, useEffect } from 'react';
import { StakeActions } from './StakeActions.jsx';

const GRAPH_URL = "/graphql"; // Use the proxy

// Query to hydrate the feed on load
const GET_RECENT_CLAIMS = `
  query GetRecentClaims {
    triples(limit: 10, order_by: {created_at: desc}) {
      id
      type
      subject { label }
      predicate { label }
      object { label }
    }
  }
`;

// This is the modal that pops up
const ClaimModal = ({ claim, provider, onClose, refreshData }) => {
  const portalBaseUrl = "https://portal.intuition.systems/explore/atom/";
  const subject = claim.subject?.label || '...';
  const predicate = claim.predicate?.label || '...';
  const object = claim.object?.label || '...';
  const claimLabel = `${subject} ${predicate} ${object}`;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-white text-2xl"
        >
          &times;
        </button>
        <h3 className="text-lg font-bold text-white mb-2" title={claimLabel}>{claimLabel}</h3>
        <a
          href={`${portalBaseUrl}${claim.id}`}
          target="_blank" rel="noopener noreferrer"
          className="text-sm text-blue-400 hover:text-blue-300 font-mono truncate"
        >
          {claim.id}
        </a>
        <div className="my-4 border-t border-gray-700"></div>
        <h4 className="text-base font-semibold text-white mb-3">Act on this Claim</h4>
        <StakeActions 
          signalId={claim.id}
          provider={provider}
          type={claim.type}
          refreshData={refreshData}
        />
      </div>
    </div>
  );
};

// This component renders one "flashing" item in the feed
const LiveClaim = ({ claim, onClick, index }) => {
  const subject = claim.subject?.label || '...';
  const predicate = claim.predicate?.label || '...';
  const object = claim.object?.label || '...';
  const claimLabel = `${subject} ${predicate} ${object}`;
  
  // ⚡ Gradient logic: 1.0 is brightest (index 0), 0.1 is darkest (index 9)
  const opacity = (10 - index) / 10; 
  
  return (
    <div 
      onClick={onClick} 
      className="relative p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer overflow-hidden"
    >
      {/* Flashing animation for the *newest* item */}
      {index === 0 && (
         <div className="absolute inset-0 bg-green-500 rounded-lg opacity-30 animate-pulse-fast-short"></div>
      )}
      {/* ⚡ Gradient overlay */}
      <div 
        className="absolute inset-0 bg-green-500 rounded-lg transition-opacity duration-500" 
        style={{ opacity: opacity * 0.15, mixBlendMode: 'plus-lighter' }}
      ></div>
      
      <div className="relative">
        <div className="text-white font-semibold truncate" title={claimLabel}>
          {claimLabel}
        </div>
        <div className="text-xs text-blue-400 font-mono truncate">{claim.id}</div>
      </div>
    </div>
  );
};

// This is the main feed component
export const LiveActivityFeed = ({ newClaim, provider, refreshData }) => {
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // 1. 🕸️ Hydrate the feed with recent claims on load
  useEffect(() => {
    const fetchRecentClaims = async () => {
      try {
        const response = await fetch(GRAPH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_RECENT_CLAIMS })
        });
        const data = await response.json();
        if (data.data?.triples) {
          setClaims(data.data.triples);
        }
      } catch (err) {
        console.error("Failed to fetch recent claims:", err);
      }
    };
    fetchRecentClaims();
  }, []);

  // 2. ⚡ Prepend new claims from the WebSocket
  useEffect(() => {
    if (newClaim) {
      setClaims(prevClaims => 
        [newClaim, ...prevClaims].filter((v,i,a) => a.findIndex(t => (t.id === v.id)) === i)
        .slice(0, 10) // Keep only the 10 latest
      );
    }
  }, [newClaim]);

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-white mb-4">Freshly Created Claims</h2>
      <div className="flex flex-col gap-3">
        {claims.length > 0 ? (
          claims.map((claim, index) => (
            <LiveClaim 
              key={claim.id} 
              claim={claim} 
              index={index} // Pass the index for the gradient
              onClick={() => setSelectedClaim(claim)} 
            />
          ))
        ) : (
          <p className="text-gray-500 text-sm">Waiting for new claims...</p>
        )}
      </div>

      {selectedClaim && (
        <ClaimModal 
          claim={selectedClaim} 
          provider={provider}
          onClose={() => setSelectedClaim(null)}
          refreshData={refreshData} // Pass refresh to the modal
        />
      )}
    </div>
  );
};