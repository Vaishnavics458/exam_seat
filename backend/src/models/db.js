// backend/src/models/db.js
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected PG error', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
