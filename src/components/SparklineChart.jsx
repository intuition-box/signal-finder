import React from 'react';
import { Line } from 'react-chartjs-2';

export const SparklineChart = ({ data, velocity, isUpdating }) => {
  const chartData = {
    labels: data.labels,
    datasets: [{
      data: data.values,
      borderColor: velocity >= 0 ? '#10B981' : '#EF4444',
      borderWidth: 1.5,
      fill: false,
      tension: 0.4,
      pointRadius: 0
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    },
    scales: {
      x: {
        display: false
      },
      y: {
        display: false
      }
    },
    animation: false
  };

  return (
    <div className={`relative w-24 h-8 ${isUpdating ? 'animate-pulse' : ''}`}>
      <Line data={chartData} options={options} />
    </div>
  );
};