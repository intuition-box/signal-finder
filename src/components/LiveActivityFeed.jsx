// src/components/LiveActivityFeed.jsx
import React, { useState, useEffect } from 'react';
import { StakeActions } from './StakeActions.jsx';
import { GRAPH_URL, PORTAL_BASE_URL } from '../config/config.js'; // Import config
// Remove local GRAPH_URL definition
// Use PORTAL_BASE_URL in the modal and links
// ...

// Query to hydrate the feed with RECENT TERMS (Atoms + Triples)
const GET_RECENT_TERMS = `
  query GetRecentTerms {
    terms(limit: 10, order_by: {created_at: desc}) {
      id
      type
      created_at
      atom { label image }
      triple {
        subject { label }
        predicate { label }
        object { label }
      }
    }
  }
`;

const ClaimModal = ({ claim, provider, onClose, refreshData }) => {
  const portalBaseUrl = PORTAL_BASE_URL;
  const isTriple = claim.type === 'Triple' || claim.type === 'CounterTriple';
  
  let claimLabel = '...';
  if (isTriple && claim.triple) {
    claimLabel = `${claim.triple.subject?.label || '...'} ${claim.triple.predicate?.label || '...'} ${claim.triple.object?.label || '...'}`;
  } else if (claim.atom) {
    claimLabel = claim.atom.label || 'Unnamed Atom';
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white text-2xl">&times;</button>
        <h3 className="text-lg font-bold text-white mb-2" title={claimLabel}>{claimLabel}</h3>
        <a href={`${portalBaseUrl}${claim.id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 font-mono truncate">
          {claim.id}
        </a>
        <div className="my-4 border-t border-gray-700"></div>
        <h4 className="text-base font-semibold text-white mb-3">Act on this {isTriple ? 'Claim' : 'Atom'}</h4>
        <StakeActions signalId={claim.id} provider={provider} type={claim.type} refreshData={refreshData} />
      </div>
    </div>
  );
};

const LiveClaim = ({ claim, onClick, index }) => {
  const isTriple = claim.type === 'Triple' || claim.type === 'CounterTriple';
  let claimLabel = '...';
  let image = null;

  if (isTriple && claim.triple) {
    claimLabel = `${claim.triple.subject?.label || '...'} ${claim.triple.predicate?.label || '...'} ${claim.triple.object?.label || '...'}`;
  } else if (claim.atom) {
    claimLabel = claim.atom.label || 'Unnamed Atom';
    image = claim.atom.image;
  }
  
  // Gradient: Index 0 (newest) = 1.0 opacity, Index 9 = 0.1 opacity
  const opacity = (10 - index) / 10; 
  
  const toHttpGateway = (ipfsUrl) => {
    if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) return ipfsUrl;
    return `https://ipfs.io/ipfs/${ipfsUrl.substring(7)}`;
  };

  return (
    <div onClick={onClick} className="relative p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer overflow-hidden">
      {/* Flash only for the very newest */}
      {index === 0 && ( <div className="absolute inset-0 bg-green-500 rounded-lg opacity-30 animate-pulse-fast-short"></div> )}
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-green-500 rounded-lg transition-opacity duration-500" style={{ opacity: opacity * 0.15, mixBlendMode: 'plus-lighter' }}></div>
      
      <div className="relative flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isTriple ? 'bg-orange-900 text-orange-200' : 'bg-blue-900 text-blue-200'}`}>
            {isTriple ? 'C' : 'A'}
        </div>
        <div className="overflow-hidden">
          <div className="text-white font-semibold truncate text-sm" title={claimLabel}>{claimLabel}</div>
          <div className="text-xs text-blue-400 font-mono truncate">{claim.id}</div>
        </div>
      </div>
    </div>
  );
};

export const LiveActivityFeed = ({ newClaim, provider, refreshData }) => {
  const [claims, setClaims] = useState([]);
  const [selectedClaim, setSelectedClaim] = useState(null);

  // 1. Hydrate on load
  useEffect(() => {
    const fetchRecentTerms = async () => {
      try {
        const response = await fetch(GRAPH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_RECENT_TERMS })
        });
        const data = await response.json();
        if (data.data?.terms) {
          setClaims(data.data.terms);
        }
      } catch (err) { console.error("Failed to fetch recent terms:", err); }
    };
    fetchRecentTerms();
  }, []);

  // 2. Prepend new items from WebSocket
  useEffect(() => {
    if (newClaim) {
      setClaims(prevClaims => {
        // Avoid duplicates
        const exists = prevClaims.some(c => c.id === newClaim.id);
        if (exists) return prevClaims;
        return [newClaim, ...prevClaims].slice(0, 10);
      });
    }
  }, [newClaim]);

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-white mb-4">Freshly Created Claims</h2>
      <div className="flex flex-col gap-3">
        {claims.length > 0 ? (
          claims.map((claim, index) => (
            <LiveClaim key={`${claim.id}-${index}`} claim={claim} index={index} onClick={() => setSelectedClaim(claim)} />
          ))
        ) : (
          <p className="text-gray-500 text-sm">Waiting for new claims...</p>
        )}
      </div>
      {selectedClaim && (
        <ClaimModal claim={selectedClaim} provider={provider} onClose={() => setSelectedClaim(null)} refreshData={refreshData} />
      )}
    </div>
  );
};