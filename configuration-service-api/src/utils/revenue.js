/**
 * Ensure expected_revenue is always returned as an integer from the API (for storage).
 * @param {number|string|null|undefined} value - Raw value from DB or input
 * @returns {number} - Integer >= 0, or 0 if invalid
 */
function toRevenueInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

/**
 * Convert numeric expected_revenue to display format for API response (e.g. 123000 → "123k", 25000 → "25k").
 * @param {number|string|null|undefined} value - Raw value from DB
 * @returns {string} - Formatted string like "123k", "25k", "1.5M", or "0"
 */
function formatRevenueForResponse(value) {
  const n = toRevenueInt(value);
  if (n === 0) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}b`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  return String(n);
}

module.exports = { toRevenueInt, formatRevenueForResponse };
