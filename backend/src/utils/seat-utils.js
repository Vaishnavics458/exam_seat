// backend/src/utils/seat-utils.js
/**
 * Seat helper utilities used across services/routes.
 */

/**
 * parseSeatId(sid)
 * Accepts formats like: r9c5, R09C05, r9_c5, r9-c5, etc.
 * Returns { row: <int>, col: <int> } or null.
 */
function parseSeatId(sid) {
  if (!sid) return null;
  const m = String(sid).match(/r0*?(\d+)[c_\\-]?0*?(\d+)/i);
  if (m) return { row: parseInt(m[1], 10), col: parseInt(m[2], 10) };
  return null;
}

module.exports = { parseSeatId };
