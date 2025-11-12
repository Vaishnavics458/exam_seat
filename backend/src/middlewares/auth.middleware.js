// backend/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'changeme';

function unauthorized(res) {
  return res.status(401).json({ error: 'Unauthorized' });
}

async function loadUserFromToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // payload should include id and role; if not, return payload as-is
    const user = {
      id: payload.id || null,
      role: payload.role || (payload.roles || null),
      email: payload.email || payload.sub || null,
      roll_number: payload.roll_number || payload.roll || null,
      name: payload.name || null
    };

    // Optionally fetch additional info from DB for students/invigilators to be sure
    if (user.role === 'student' && (!user.roll_number || !user.name)) {
      // try to fetch from students table by id
      try {
        const r = await db.query('SELECT id, student_id, roll_number, name FROM students WHERE id=$1 LIMIT 1', [user.id]);
        if (r.rowCount) {
          const row = r.rows[0];
          user.db_student = row;
          user.roll_number = user.roll_number || row.roll_number || row.student_id;
          user.name = user.name || row.name;
        }
      } catch (e) { /* ignore DB failures - user still usable */ }
    } else if (user.role === 'invigilator' && (!user.name || !user.id)) {
      try {
        const r = await db.query('SELECT id, name FROM invigilators WHERE id=$1 LIMIT 1', [user.id]);
        if (r.rowCount) {
          user.db_inv = r.rows[0];
          user.name = user.name || user.db_inv.name;
          user.id = user.id || user.db_inv.id;
        }
      } catch (e) { /* ignore */ }
    }

    return user;
  } catch (err) {
    return null;
  }
}

async function authenticate(req, res, next) {
  // look for Authorization header
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!auth) return unauthorized(res);

  const parts = String(auth).split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return unauthorized(res);
  const token = parts[1];

  const user = await loadUserFromToken(token);
  if (!user || !user.role) return unauthorized(res);

  req.user = user;
  req.token = token;
  next();
}

/**
 * authorizeRoles(...allowedRoles)
 * usage: authorizeRoles('admin'), authorizeRoles('admin','invigilator')
 */
function authorizeRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) return res.status(401).json({ error: 'Unauthorized' });
    if (allowed.length === 0) return next();
    if (allowed.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { authenticate, authorizeRoles, loadUserFromToken };
