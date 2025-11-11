// Enhanced version of your component
import React, { useState, useEffect, useCallback } from 'react';
import { StakeActions } from './StakeActions.jsx';

const GRAPH_URL = "/graphql";

// Replace your current queries with this unified approach
const GET_RECENT_ACTIVITY = `
  query GetRecentActivity {
    atoms: terms(where: {type: {_eq: "Atom"}}, limit: 10, order_by: {created_at: desc}) {
      id
      type
      created_at
      atom { 
        label 
        image 
      }
      total_market_cap
      positions_aggregate { 
        aggregate { 
          count 
        } 
      }
    }
    triples: terms(where: {type: {_eq: "Triple"}}, limit: 10, order_by: {created_at: desc}) {
      id
      type
      created_at
      total_market_cap
      positions_aggregate { 
        aggregate { 
          count 
        } 
      }
      triple {
        subject { 
          term_id 
          label 
        }
        predicate { 
          term_id 
          label 
        }
        object { 
          term_id 
          label 
        }
      }
    }
  }
`;

// Update your WebSocket subscription to capture both types
const LIVE_ACTIVITY_SUBSCRIPTION = `
  subscription LiveActivity {
    newTerms: terms(limit: 1, order_by: {created_at: desc}) {
      id
      type
      created_at
      atom { 
        label 
        image 
      }
      total_market_cap
      positions_aggregate { 
        aggregate { 
          count 
        } 
      }
      triple {
        subject { 
          term_id 
          label 
        }
        predicate { 
          term_id 
          label 
        }
        object { 
          term_id 
          label 
        }
      }
    }
  }
`;

// Enhanced activity item component
const LiveActivityItem = ({ item, onClick, index }) => {
  const isAtom = item.type === 'Atom';
  const isTriple = item.type === 'Triple';

  // Generate display content
  const getDisplayContent = () => {
    if (isAtom) {
      return {
        title: item.atom?.label || 'New Atom',
        subtitle: `${item.positions_aggregate?.aggregate?.count || 0} positions`,
        icon: '🏷️',
        description: 'New concept created'
      };
    } else {
      const subject = item.triple?.subject?.label || '...';
      const predicate = item.triple?.predicate?.label || '...';
      const object = item.triple?.object?.label || '...';
      return {
        title: `${subject} ${predicate} ${object}`,
        subtitle: `${item.positions_aggregate?.aggregate?.count || 0} positions`,
        icon: '🔗',
        description: 'New relationship claimed'
      };
    }
  };

  const content = getDisplayContent();

  // Enhanced gradient calculation
  const opacity = Math.max(0.1, (10 - index) / 10);
  const greenIntensity = Math.max(0.05, (10 - index) / 12);

  return (
    <div
      onClick={onClick}
      className="relative group p-4 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-green-500/30 transition-all duration-300 cursor-pointer overflow-hidden"
    >
      {/* Flash animation for newest item */}
      {index === 0 && (
        <div className="absolute inset-0 bg-green-400/20 rounded-xl animate-pulse-once"></div>
      )}

      {/* Gradient overlay - lighter green for newer items */}
      <div
        className="absolute inset-0 rounded-xl transition-all duration-500"
        style={{
          background: `linear-gradient(135deg, rgba(34, 197, 94, ${greenIntensity}) 0%, rgba(21, 128, 61, ${greenIntensity * 0.5}) 100%)`,
          mixBlendMode: 'multiply'
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          {/* Type indicator */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            isAtom ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
          }`}>
            {content.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                isAtom ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {isAtom ? 'ATOM' : 'TRIPLE'}
              </span>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>

            <h3 
              className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-2"
              title={content.title}
            >
              {content.title}
            </h3>

            <p className="text-xs text-gray-400 mb-2">{content.subtitle}</p>

            {/* Market cap if available */}
            {item.total_market_cap && (
              <div className="text-xs text-green-400 font-mono">
                ${(parseFloat(item.total_market_cap) / 1e18).toFixed(2)} TRUST
              </div>
            )}
          </div>

          {/* Hover indicator */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-xs">→</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom border indicator */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
        style={{ opacity: opacity * 0.8 }}
      />
    </div>
  );
};

// Enhanced modal with better actions
const ActivityModal = ({ item, provider, onClose, refreshData }) => {
  const isAtom = item.type === 'Atom';
  const portalUrl = `https://portal.intuition.systems/explore/${isAtom ? 'atom' : 'triple'}/${item.id}`;

  const getModalContent = () => {
    if (isAtom) {
      return {
        title: item.atom?.label || 'Unnamed Atom',
        type: 'Concept',
        description: 'A new concept has been created in the knowledge graph.'
      };
    } else {
      const subject = item.triple?.subject?.label || '...';
      const predicate = item.triple?.predicate?.label || '...';
      const object = item.triple?.object?.label || '...';
      return {
        title: `${subject} ${predicate} ${object}`,
        type: 'Relationship',
        description: 'A new relationship has been claimed between concepts.'
      };
    }
  };

  const content = getModalContent();

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600 rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAtom ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
            }`}>
              {isAtom ? '🏷️' : '🔗'}
            </div>
            <div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                isAtom ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
              }`}>
                {content.type}
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2 line-clamp-3" title={content.title}>
            {content.title}
          </h2>

          <p className="text-gray-400 text-sm mb-4">{content.description}</p>

          {/* ID and link */}
          <div className="bg-gray-800/50 rounded-lg p-3">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 font-mono break-all transition-colors"
            >
              {item.id}
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-center transition-colors"
            >
              View on Portal
            </a>
          </div>

          {provider && (
            <>
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">Take Action</h3>
                <StakeActions
                  signalId={item.id}
                  provider={provider}
                  type={item.type}
                  refreshData={refreshData}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Main component
export const LiveActivityFeed = ({ newClaim, provider, refreshData }) => {
  const [activity, setActivity] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch recent activity on mount
  const fetchRecentActivity = useCallback(async () => {
    try {
      const response = await fetch(GRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GET_RECENT_ACTIVITY })
      });

      const data = await response.json();
      if (data.data) {
        // Combine atoms and triples, sort by created_at
        const combined = [
          ...(data.data.atoms || []),
          ...(data.data.triples || [])
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
         .slice(0, 10);

        setActivity(combined);
      }
    } catch (err) {
      console.error("Failed to fetch recent activity:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentActivity();
  }, [fetchRecentActivity]);

  // Handle new items from WebSocket
  useEffect(() => {
    if (newClaim) {
      setActivity(prev => {
        const updated = [newClaim, ...prev]
          .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
          .slice(0, 10);
        return updated;
      });
    }
  }, [newClaim]);

  if (loading) {
    return (
      <div className="w-full">
        <h2 className="text-lg font-semibold text-white mb-4">Live Activity</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800/30 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Live Activity</h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          LIVE
        </div>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {activity.length > 0 ? (
          activity.map((item, index) => (
            <LiveActivityItem
              key={`${item.id}-${item.created_at}`}
              item={item}
              index={index}
              onClick={() => setSelectedItem(item)}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">👀</div>
            <p className="text-gray-500 text-sm">Waiting for new activity...</p>
          </div>
        )}
      </div>

      {selectedItem && (
        <ActivityModal
          item={selectedItem}
          provider={provider}
          onClose={() => setSelectedItem(null)}
          refreshData={refreshData}
        />
      )}
    </div>
  );
};


