// src/components/SignalChart.js
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement);

export const SignalChart = ({ data, velocity }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
  };

  const chartData = {
    labels: data.labels,
    datasets: [{
      data: data.datasets[0].data,
      borderColor: velocity >= 0 ? '#22c55e' : '#ef4444', // Green for up, red for down
      borderWidth: 2,
      tension: 0.4,
    }],
  };

  return (
    <div className="w-24 h-8">
      <Line options={options} data={chartData} />
    </div>
  );
};