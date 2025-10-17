// src/utils/format.js
export const formatNumber = (num) => {
  // Ensure we are working with a number
  const number = Number(num);
  if (isNaN(number)) return '0.00';

  if (Math.abs(number) >= 1_000_000) {
    return (number / 1_000_000).toFixed(2) + 'M';
  }
  if (Math.abs(number) >= 1_000) {
    return (number / 1_000).toFixed(1) + 'K';
  }
  
  return number.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};