// backend/src/utils/schema-utils.js
// Helper to detect assignment table name (cached) to avoid repeating information_schema queries
const db = require('../models/db');

let cachedAssignTable = null;

/**
 * detectAssignTable()
 * - Returns the name of the invig assignment table (one of common variants).
 * - Caches the result for the lifetime of the process to avoid repeated metadata queries.
 */
async function detectAssignTable() {
  if (cachedAssignTable) return cachedAssignTable;

  try {
    const tblRes = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('invig_assignments','invigilation_assignments','invigilator_assignments','invig_assignments','invig_assign')
      LIMIT 1;
    `);
    cachedAssignTable = (tblRes.rows[0] && tblRes.rows[0].table_name) || 'invig_assignments';
  } catch (err) {
    // On error, fallback to a sensible default but log warning
    console.warn('detectAssignTable failed, falling back to "invig_assignments":', err && err.message);
    cachedAssignTable = 'invig_assignments';
  }
  return cachedAssignTable;
}

/**
 * Optional: allow invalidating the cache if you change the DB at runtime.
 * Not required for normal usage but handy for tests / admin scripts.
 */
function clearAssignTableCache() {
  cachedAssignTable = null;
}

module.exports = { detectAssignTable, clearAssignTableCache };
