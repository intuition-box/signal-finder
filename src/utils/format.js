// src/utils/format.js

export const formatNumber = (value) => {
  // Coerce value to a number, handling null/undefined
  const num = Number(value);

  // Guard against NaN (Not a Number)
  if (isNaN(num)) {
    return '0.00';
  }

  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }

  // Use toLocaleString for standard comma separation, but handle small numbers
  if (num === 0) return '0.00';
  if (Math.abs(num) < 1) return num.toFixed(2);
  
  // Use toLocaleString only when we are sure `num` is a valid number
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};