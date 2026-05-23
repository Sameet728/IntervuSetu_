/**
 * Format seconds into human-readable string: "4m 32s"
 */
const formatDuration = (seconds = 0) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

/**
 * Calculate elapsed seconds between two Date objects
 */
const elapsedSeconds = (startDate, endDate = new Date()) => {
  return Math.round((new Date(endDate) - new Date(startDate)) / 1000);
};

module.exports = { formatDuration, elapsedSeconds };
