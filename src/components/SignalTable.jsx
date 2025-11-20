// src/components/SignalTable.jsx
import React, { useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { SparklineChart } from './SparklineChart.jsx';
import { formatNumber } from '../utils/format.js';
import { createDefaultTrend } from '../utils/analysis.js';

// Enhanced Triple component with better compact display
const TripleClaim = ({ triple, compact = false }) => {
  if (!triple) return <span className="text-gray-500">Claim data loading...</span>;
  
  const subject = triple.subject?.label || '...';
  const predicate = triple.predicate?.label || '...';
  const object = triple.object?.label || '...';
  
  if (compact) {
    return (
      <div className="text-sm" title={`${subject} ${predicate} ${object}`}>
        <span className="font-semibold text-blue-300">{subject}</span>
        <span className="text-gray-400 mx-1">→</span>
        <span className="font-semibold text-green-300">{object}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="px-2 py-0.5 bg-blue-600/30 text-blue-200 rounded text-xs font-semibold max-w-[100px] truncate" title={subject}>
        {subject}
      </span>
      <span className="text-gray-400 text-xs whitespace-nowrap">{predicate}</span>
      <span className="px-2 py-0.5 bg-green-600/30 text-green-200 rounded text-xs font-semibold max-w-[100px] truncate" title={object}>
        {object}
      </span>
    </div>
  );
};

// Enhanced confidence indicator with larger size and better visibility
const ConfidenceIndicator = ({ confidence, className = "" }) => {
  const getColor = () => {
    if (confidence >= 0.7) return 'text-green-400 bg-green-400/20';
    if (confidence >= 0.4) return 'text-yellow-400 bg-yellow-400/20';
    return 'text-red-400 bg-red-400/20';
  };
  
  const getLabel = () => {
    if (confidence >= 0.7) return 'HIGH';
    if (confidence >= 0.4) return 'MED';
    return 'LOW';
  };
  
  return (
    <div className={`px-2 py-1 rounded-full text-xs font-bold border ${getColor()} ${className}`} 
         title={`Data Confidence: ${(confidence * 100).toFixed(0)}% - Based on ${confidence >= 0.7 ? '10+' : confidence >= 0.4 ? '4-9' : '<4'} data points`}>
      {getLabel()}
    </div>
  );
};

// Enhanced Support/Oppose Actions for Triples
const TripleActions = ({ signalId, supportCount, opposeCount, onAction }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Thumb buttons row */}
      <div className="flex items-center gap-3">
        {/* Support thumb */}
        <button
          onClick={() => onAction('support')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 transition-colors group"
          title={`Support this claim (${supportCount} supporters)`}
        >
          <div className="text-blue-400 group-hover:text-blue-300 text-xl">👍</div>
          <span className="text-blue-400 group-hover:text-blue-300 text-xs font-semibold">{supportCount}</span>
        </button>

        {/* Oppose thumb */}
        <button
          onClick={() => onAction('oppose')}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 transition-colors group"
          title={`Oppose this claim (${opposeCount} opponents)`}
        >
          <div className="text-orange-400 group-hover:text-orange-300 text-xl">👎</div>
          <span className="text-orange-400 group-hover:text-orange-300 text-xs font-semibold">{opposeCount}</span>
        </button>
      </div>

      {/* Labels row */}
      <div className="flex items-center gap-4">
        <div className="text-xs text-blue-400 font-medium">Support</div>
        <div className="text-xs text-orange-400 font-medium">Oppose</div>
      </div>
    </div>
  );
};

// Row naming system based on lens type
const getRowName = (index, sortLens) => {
  const baseNames = {
    heavyweight: ["TITAN", "WHALE", "FORTRESS", "EMPIRE", "COLOSSUS", "MAMMOTH", "LEVIATHAN", "BEHEMOTH", "GIANT", "MOUNTAIN"],
    trending: ["ROCKET", "WAVE", "SURGE", "MOMENTUM", "BOOST", "RISE", "CLIMB", "SPIKE", "JUMP", "BURST"],
    emerging: ["SPARK", "SEED", "EMBER", "SPROUT", "DAWN", "WHISPER", "SHADOW", "GHOST", "ECHO", "PULSE"]
  };
  
  const names = baseNames[sortLens] || baseNames.trending;
  return names[index % names.length] || `${sortLens.toUpperCase()}-${index + 1}`;
};

export const SignalTable = ({ signals, provider, metricLens, refreshData, sortLens }) => {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const portalBaseUrl = "https://portal.intuition.systems/explore";
  const isHeavyweight = sortLens === 'heavyweight';

  // Memoized IPFS gateway conversion
  const toHttpGateway = useMemo(() => (ipfsUrl) => {
    if (!ipfsUrl || !ipfsUrl.startsWith('ipfs://')) return ipfsUrl;
    return `https://ipfs.io/ipfs/${ipfsUrl.substring(7)}`;
  }, []);

  // Memoized signal processing
  const processedSignals = useMemo(() => {
    return signals.map((signal, index) => {
      const capitalTrend = signal.capitalTrend || createDefaultTrend();
      const communityTrend = signal.communityTrend || createDefaultTrend();
      const trend = metricLens === 'capital' ? capitalTrend : communityTrend;
      const isTriple = signal.type === 'Triple' || signal.type === 'CounterTriple';
      
      // Mock support/oppose counts - replace with real data
      const supportCount = Math.floor(Math.random() * 50) + 1;
      const opposeCount = Math.floor(Math.random() * 20);
      
      return {
        ...signal,
        capitalTrend,
        communityTrend,
        trend,
        isTriple,
        urlPath: isTriple ? 'triple' : 'atom',
        rowName: getRowName(index, sortLens),
        supportCount,
        opposeCount
      };
    });
  }, [signals, metricLens, sortLens]);

  const toggleRowExpansion = (signalId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(signalId)) {
        newSet.delete(signalId);
      } else {
        newSet.add(signalId);
      }
      return newSet;
    });
  };

  const handleTripleAction = (signalId, action) => {
    console.log(`${action} action for signal ${signalId}`);
    // Implement your support/oppose logic here
    if (refreshData) refreshData();
  };

  return (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider bg-gray-900/50">
            <tr>
              <th className="py-3 px-4 text-left w-20">Rank</th>
              <th className="py-3 px-4 text-left min-w-[300px]">On-Chain Item / Claim</th>
              <th className="py-3 px-4 text-left w-20">Type</th>
              {isHeavyweight ? (
                <th className="py-3 px-4 text-left">24H Activity</th>
              ) : (
                <>
                  <th className="py-3 px-4 text-left">Trend</th>
                  <th className="py-3 px-4 text-left">Velocity</th>
                  <th className="py-3 px-4 text-left">Signal</th>
                </>
              )}
              <th className="py-3 px-4 text-left">Total</th>
              <th className="py-3 px-4 text-center w-32">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {processedSignals.map((signal, index) => {
              const { trend, isTriple, urlPath, rowName } = signal;
              const percentageChange = trend.percentageChange;
              const velocity = trend.velocity;
              const chartData = trend.chartData;
              const isExpanded = expandedRows.has(signal.id);

              return (
                <React.Fragment key={signal.id}>
                  <tr className={`${isTriple ? 'bg-purple-900/10' : 'bg-gray-900/20'} hover:bg-gray-800/50 transition-colors`}>
                    {/* Enhanced Rank Column */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col items-center">
                        <span className="text-gray-400 font-mono text-sm">#{index + 1}</span>
                        <span className="text-xs font-bold text-yellow-400 mt-1">{rowName}</span>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        {/* Main content display */}
                        {isTriple ? (
                          <TripleClaim triple={signal.triple} compact={!isExpanded} />
                        ) : (
                          <div className="flex items-center gap-3">
                            <img 
                              src={toHttpGateway(signal.image) || `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiMyZDM3NDgiIHZpZXdCb3g9IjAgMCA0MCA0MCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iMjAiLz48L3N2Zz4=`}
                              alt={signal.label || signal.id}
                              className="w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0"
                              loading="lazy"
                            />
                            <div className="overflow-hidden">
                              <div className="font-semibold text-white truncate" title={signal.label || signal.id}>
                                {signal.label || `${signal.id.slice(0, 12)}...`}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* ID, Portal link, and Enhanced Confidence */}
                        <div className="flex items-center gap-3">
                          <a
                            href={`${portalBaseUrl}/${urlPath}/${signal.id}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 font-mono truncate transition-colors flex-1"
                            title={`View ${signal.id} on Intuition Portal`}
                          >
                            {signal.id.slice(0, 16)}...
                          </a>
                          
                          {/* Enhanced Confidence Indicator */}
                          {signal.trend.confidence !== undefined && (
                            <ConfidenceIndicator confidence={signal.trend.confidence} />
                          )}
                          
                          {/* Larger Expand Button */}
                          <button
                            onClick={() => toggleRowExpansion(signal.id)}
                            className="text-gray-400 hover:text-white transition-colors text-lg p-1"
                            title={isExpanded ? "Collapse details" : "Expand details"}
                          >
                            {isExpanded ? '🔽' : '▶️'}
                          </button>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-full whitespace-nowrap border ${
                        isTriple ? 'bg-purple-600/20 text-purple-300 border-purple-600/40' : 'bg-blue-600/20 text-blue-300 border-blue-600/40'
                      }`}>
                        {isTriple ? '🔗 CLAIM' : '🏷️ ATOM'}
                      </span>
                    </td>
                    
                    {isHeavyweight ? (
                      <td className="py-4 px-4">
                        <div className={`font-bold ${
                          metricLens === 'capital' ? 
                            (signal.capitalTrend.recentCapital > 0 ? 'text-green-500' : 'text-gray-500') : 
                            (signal.communityTrend.recentStakers > 0 ? 'text-green-500' : 'text-gray-500')
                        }`}>
                          {metricLens === 'capital' ? (
                            <>
                              <div className="text-lg">+{formatNumber(signal.capitalTrend.recentCapital)} $TRUST</div>
                              <div className="text-xs text-gray-400 font-normal">(24h activity)</div>
                            </>
                          ) : (
                            <>
                              <div className="text-lg">+{formatNumber(signal.communityTrend.recentStakers)} Stakers</div>
                              <div className="text-xs text-gray-400 font-normal">(24h activity)</div>
                            </>
                          )}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="py-4 px-4">
                          {chartData && chartData.labels.length > 1 ? (
                            <SparklineChart data={chartData} velocity={velocity} />
                          ) : (
                            <div className='w-28 h-10 bg-gray-800/20 rounded flex items-center justify-center'>
                              <span className="text-xs text-gray-500">No data</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="py-4 px-4">
                          <div className={`font-bold ${velocity >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            <div className="text-base">
                              {velocity >= 0 ? '+' : ''}{formatNumber(velocity)}
                              <span className="text-gray-400 font-normal text-xs ml-1">
                                {metricLens === 'capital' ? '$T/hr' : 'U/hr'}
                              </span>
                            </div>
                            <div className={`text-xs font-normal ${percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({percentageChange >= 0 ? '+' : ''}{percentageChange.toFixed(1)}%)
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-4 px-4 text-center">
                          <div className={`text-3xl ${
                            trend?.acceleration >= 0.1 ? 'text-green-400' : 
                            trend?.acceleration <= -0.1 ? 'text-red-400' : 'text-gray-500'
                          }`} title={`Acceleration: ${trend?.acceleration?.toFixed(3) || 0}`}>
                            {trend?.acceleration > 0.1 ? '🚀' : trend?.acceleration < -0.1 ? '📉' : '⚖️'}
                          </div>
                        </td>
                      </>
                    )}
                    
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-base">
                        {metricLens === 'capital' 
                          ? formatNumber(parseFloat(ethers.utils.formatEther(signal.totalStaked || '0')))
                          : formatNumber(signal.totalStakers || 0)
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        {metricLens === 'capital' ? '$TRUST' : 'Stakers'}
                      </div>
                    </td>
                    
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        {isTriple ? (
                          <TripleActions
                            signalId={signal.id}
                            supportCount={signal.supportCount}
                            opposeCount={signal.opposeCount}
                            onAction={(action) => handleTripleAction(signal.id, action)}
                          />
                        ) : (
                          <div className="flex flex-col gap-1">
                            <button className="px-3 py-1.5 bg-green-600/20 text-green-400 rounded text-xs hover:bg-green-600/40 transition-colors">
                              Stake
                            </button>
                            <button className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/40 transition-colors">
                              Unstake
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Enhanced Expanded Row */}
                  {isExpanded && (
                    <tr className="bg-gray-800/30 border-t border-gray-700">
                      <td colSpan="8" className="py-6 px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
                          {/* Stats Section */}
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                              📊 Recent Activity
                            </h4>
                            <div className="space-y-2 text-gray-300">
                              <div className="flex justify-between">
                                <span>Capital (24h):</span>
                                <span className="text-green-400">+{formatNumber(signal.capitalTrend.recentCapital)} $TRUST</span>
                              </div>
                              <div className="flex justify-between">
                                <span>New Stakers (24h):</span>
                                <span className="text-blue-400">+{formatNumber(signal.communityTrend.recentStakers)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Data Confidence:</span>
                                <span className={trend.confidence >= 0.7 ? 'text-green-400' : trend.confidence >= 0.4 ? 'text-yellow-400' : 'text-red-400'}>
                                  {(trend.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Triple Details */}
                          {isTriple && (
                            <div className="bg-gray-900/50 rounded-lg p-4">
                              <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                                🔗 Full Claim
                              </h4>
                              <TripleClaim triple={signal.triple} />
                            </div>
                          )}
                          
                          {/* Market Insights */}
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                              🎯 {rowName} Insights
                            </h4>
                            <div className="space-y-2 text-gray-300 text-xs">
                              <div>Rank: #{index + 1} in {sortLens} lens</div>
                              <div>Category: {sortLens === 'heavyweight' ? 'Institutional Grade' : sortLens === 'trending' ? 'Momentum Play' : 'Early Alpha'}</div>
                              <div>Risk Level: {sortLens === 'heavyweight' ? 'Low' : sortLens === 'trending' ? 'Medium' : 'High'}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};