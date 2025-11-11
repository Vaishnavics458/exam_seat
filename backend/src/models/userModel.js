const db = require('./db');

async function findByEmail(email) {
  const res = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  return res.rows[0];
}

async function findByRoll(roll) {
  const res = await db.query('SELECT * FROM users WHERE roll_number=$1', [roll]);
  return res.rows[0];
}

async function createUser({ name, email, roll_number, password_hash, role }) {
  const res = await db.query(
    `INSERT INTO users (name, email, roll_number, password_hash, role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, name, email, roll_number, role`,
    [name, email, roll_number, password_hash, role]
  );
  return res.rows[0];
}

module.exports = { findByEmail, findByRoll, createUser };
