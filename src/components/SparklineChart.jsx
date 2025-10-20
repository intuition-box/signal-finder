import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

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

  const instanceKey = `${data.labels.length}-${data.labels[data.labels.length - 1] || ''}-${velocity}`;

  return (
    <div className={`relative w-24 h-8 ${isUpdating ? 'animate-pulse' : ''}`}>
      <Line key={instanceKey} data={chartData} options={options} redraw />
    </div>
  );
};