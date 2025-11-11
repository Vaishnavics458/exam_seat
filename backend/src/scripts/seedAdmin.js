const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();
const db = require('../models/db');

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = 'Super Admin';

  const hash = await bcrypt.hash(password, 10);

  const existing = await db.query('SELECT * FROM users WHERE email=$1', [email]);
  if (existing.rowCount > 0) {
    console.log('Admin already exists');
    process.exit(0);
  }

  await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)',
    [name, email, hash, 'admin']
  );

  console.log(`Admin created: ${email} / ${password}`);
  process.exit(0);
})();
