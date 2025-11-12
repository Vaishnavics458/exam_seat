// backend/src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models/db');

// sanity check for JWT secret early
if (!process.env.JWT_SECRET) {
  console.error('!!! JWT_SECRET is NOT set. Set backend/.env JWT_SECRET and restart the server !!!');
} else {
  console.log('JWT_SECRET is set (auth.routes)'); // non-sensitive log
}

/**
 * Helper: create JWT token (throws if secret missing)
 */
function createToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET missing');
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

/**
 * POST /api/auth/login
 * Body for admin: { role: "admin", email: "...", password: "..." }
 * Body for student: { role: "student", roll_number: "..." }
 * Body for invigilator: { role: "invigilator", name: "..." } OR { role: "invigilator", invigilator_id: 3 }
 */
router.post('/login', async (req, res) => {
  const body = req.body || {};
  const role = (body.role || '').toLowerCase();

  try {
    if (role === 'admin') {
      const { email, password } = body;
      if (!email || !password) return res.status(400).json({ error: 'email and password required for admin login' });

      // users table expected: id, name, email, password_hash, role
      const q = 'SELECT id, name, email, password_hash, role FROM users WHERE email = $1 LIMIT 1';
      const r = await db.query(q, [email]);
      if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' });

      const user = r.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash || '');
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

      const token = createToken({ id: user.id, role: user.role || 'admin', email: user.email });
      return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    if (role === 'student') {
      const { roll_number } = body;
      if (!roll_number) return res.status(400).json({ error: 'roll_number required for student login' });

      const q = 'SELECT id, student_id, roll_number, name FROM students WHERE roll_number = $1 LIMIT 1';
      const r = await db.query(q, [roll_number]);
      if (r.rowCount === 0) return res.status(404).json({ error: 'Student not found' });

      const s = r.rows[0];
      const token = createToken({ id: s.id, role: 'student', roll_number: s.roll_number });
      return res.json({ token, user: { id: s.id, student_id: s.student_id, roll_number: s.roll_number, name: s.name, role: 'student' } });
    }

    if (role === 'invigilator') {
      const { name, invigilator_id } = body;
      if (!name && !invigilator_id) return res.status(400).json({ error: 'invigilator_id or name required for invigilator login' });

      let r;
      if (invigilator_id) {
        r = await db.query('SELECT id, invigilator_id, name, courses FROM invigilators WHERE id = $1 OR invigilator_id = $1 LIMIT 1', [invigilator_id]);
      } else {
        // case-insensitive match
        r = await db.query('SELECT id, invigilator_id, name, courses FROM invigilators WHERE name ILIKE $1 LIMIT 1', [name]);
      }

      if (!r || r.rowCount === 0) return res.status(404).json({ error: 'Invigilator not found' });

      const iv = r.rows[0];
      const token = createToken({ id: iv.id, role: 'invigilator', name: iv.name });
      return res.json({ token, user: { id: iv.id, invigilator_id: iv.invigilator_id, name: iv.name, courses: iv.courses || null, role: 'invigilator' } });
    }

    return res.status(400).json({ error: 'role must be one of admin|student|invigilator' });
  } catch (err) {
    console.error('POST /auth/login error', err && (err.stack || err.message || err));
    return res.status(500).json({ error: 'Server error' });
  }
});

/* Optional: GET /api/auth/me to verify token (frontend helper) */
const authMiddleware = (req, res, next) => {
  const auth = req.headers && req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization header' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid Authorization header format' });
  const token = parts[1];
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT secret not configured' });
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
