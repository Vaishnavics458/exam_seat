// backend/src/utils/run-migrations.js
const fs = require('fs');
const path = require('path');
const db = require('../models/db');
const migrationsDir = path.resolve(__dirname, '../../migrations');

async function run() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    console.log('Running', f);
    await db.query(sql);
  }
  console.log('Migrations complete');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
