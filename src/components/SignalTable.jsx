// src/components/SignalTable.jsx

export const SignalTable = ({ signals, provider, metricLens }) => {
  // Add loading animation component
  const LoadingAnimation = () => (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg overflow-hidden p-4">
      <div className="animate-pulse space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gray-700 rounded-full"/>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"/>
              <div className="h-3 bg-gray-700 rounded w-1/2"/>
            </div>
            <div className="w-24 h-8 bg-gray-700 rounded"/>
            <div className="w-20 bg-gray-700 rounded h-6"/>
            <div className="w-8 bg-gray-700 rounded-full h-8"/>
            <div className="w-24 bg-gray-700 rounded h-8"/>
          </div>
        ))}
      </div>
    </div>
  );

  // Add empty state component
  const EmptyState = () => (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg p-8 text-center">
      <div className="text-gray-400 mb-4">No signals found on the network</div>
      <div className="text-sm text-gray-500">
        This could be because:
        <ul className="list-disc list-inside mt-2">
          <li>The network is still initializing</li>
          <li>No terms have been created yet</li>
          <li>There might be connectivity issues</li>
        </ul>
      </div>
    </div>
  );

  // Main render logic with dynamic updates
  const renderSignalRow = (signal, index) => {
    const trend = metricLens === 'capital' ? signal.capitalTrend : signal.communityTrend;
    
    return (
      <tr 
        key={signal.id} 
        className="hover:bg-gray-800/50 transition-colors duration-200"
      >
        <td className="py-4 px-4 text-gray-400">{index + 1}</td>
        <td className="py-4 px-4 max-w-xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={signal.image || `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiIGZpbGw9IiMyZDM3NDgiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIC8+PC9zdmc+`} 
                alt={signal.label || signal.id}
                className="w-10 h-10 rounded-full bg-gray-700 object-cover flex-shrink-0"
              />
              {signal.isUpdating && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-ping"/>
              )}
            </div>
            <div>
              <div className="font-semibold text-white truncate">
                {signal.label || signal.id.slice(0, 12) + '...'}
              </div>
              <div className="text-xs text-blue-400 font-mono truncate">
                {signal.id}
              </div>
            </div>
          </div>
        </td>
        <td className="py-4 px-4">
          {trend && trend.chartData.labels.length > 1 ? (
            <SparklineChart 
              data={trend.chartData} 
              velocity={trend.velocity} 
              isUpdating={signal.isUpdating}
            />
          ) : <div className="w-24 h-8"/>}
        </td>
        <td className={`py-4 px-4 font-bold ${trend?.velocity >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          <div className="flex items-center gap-2">
            {trend?.velocity >= 0 ? '+' : ''}{formatNumber(trend?.velocity || 0)}
            <span className="text-gray-400 font-normal">
              {metricLens === 'capital' ? '$TRUST/hr' : ' Users/hr'}
            </span>
          </div>
        </td>
        <td className={`py-4 px-4 text-lg font-mono ${
          trend?.acceleration >= 0.1 ? 'text-green-400' : 
          trend?.acceleration <= -0.1 ? 'text-red-400' : 
          'text-gray-500'
        }`}>
          {trend?.acceleration > 0.1 ? '▲' : trend?.acceleration < -0.1 ? '▼' : '▬'}
        </td>
        <td className="py-4 px-4">
          <div className="font-bold text-white">
            {metricLens === 'capital' 
              ? formatNumber(ethers.utils.formatEther(signal.totalStaked || '0')) 
              : (signal.totalStakers || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            {metricLens === 'capital' ? '$TRUST' : 'Stakers'}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="flex justify-center">
            <StakeActions 
              signalId={signal.id} 
              provider={provider} 
              disabled={signal.isUpdating}
            />
          </div>
        </td>
      </tr>
    );
  };

  // Main render with loading and empty states
  if (!signals) return <LoadingAnimation />;
  if (signals.length === 0) return <EmptyState />;

  return (
    <div className="bg-[#161b22] border border-gray-700 rounded-lg overflow-hidden">
      <table className="min-w-full">
        <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
          <tr>
            <th className="py-3 px-4 text-left w-12">#</th>
            <th className="py-3 px-4 text-left">On-Chain Item / Claim</th>
            <th className="py-3 px-4 text-left">Trend</th>
            <th className="py-3 px-4 text-left">Velocity</th>
            <th className="py-3 px-4 text-left">Acceleration</th>
            <th className="py-3 px-4 text-left">Total</th>
            <th className="py-3 px-4 text-center">Act</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {signals.map(renderSignalRow)}
        </tbody>
      </table>
    </div>
  );
};