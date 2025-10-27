// src/components/SparklineChart.jsx
import React, { useRef, useEffect } from 'react'; // Import React, useRef, useEffect
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'; // Added Tooltip

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip); // Register Tooltip

export const SparklineChart = ({ data, velocity }) => {
  const chartRef = useRef(null); // Ref to access the chart instance

  // *** ROBUST GUARD: Check for valid data structure ***
  const hasValidData = data &&
                       Array.isArray(data.labels) && data.labels.length > 1 &&
                       Array.isArray(data.datasets) && data.datasets.length > 0 &&
                       Array.isArray(data.datasets[0]?.data) && data.datasets[0].data.length > 1;

  // Render a placeholder if data is invalid or insufficient
  if (!hasValidData) {
    return <div className="w-24 h-8 opacity-50 bg-gray-800 rounded" />;
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Disable animations for stability
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }, // Keep tooltips disabled for sparkline
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      point: { radius: 0 },
    },
    interaction: { // Disable interactions
        intersect: false,
        mode: 'index',
    },
  };

  const chartData = {
    labels: data.labels,
    datasets: [{
      data: data.datasets[0].data,
      borderColor: velocity >= 0 ? '#22c55e' : '#ef4444', // Green/Red based on velocity
      borderWidth: 2,
      tension: 0.4,
    }],
  };

  // Effect to handle potential chart destruction on error or re-render
  useEffect(() => {
    const chartInstance = chartRef.current;
    return () => {
      // Clean up chart instance on component unmount
      if (chartInstance) {
        chartInstance.destroy();
      }
    };
  }, []); // Run only on mount and unmount


  // Render the chart within a div that has explicit dimensions
  return (
    <div className="w-24 h-8">
       {/* Use ref prop to get chart instance */}
      <Line ref={chartRef} options={options} data={chartData} />
    </div>
  );
};