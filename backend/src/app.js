// backend/src/app.js

// 🔹 Load environment variables first — before any other imports
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendEnv = path.resolve(__dirname, '../.env');       // backend/.env
const projectRootEnv = path.resolve(__dirname, '../../.env'); // project root .env

if (fs.existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
  console.log('✅ Loaded env from', backendEnv);
} else if (fs.existsSync(projectRootEnv)) {
  dotenv.config({ path: projectRootEnv });
  console.log('✅ Loaded env from', projectRootEnv);
} else {
  dotenv.config(); // fallback
  console.warn('⚠️ dotenv: no .env found in backend/ or project root — using process.env defaults');
}

// 🔹 Import core dependencies (AFTER dotenv)
const express = require('express');
const cors = require('cors');
const routes = require('./routes'); // main API router
const db = require('./models/db');  // DB connection check (optional but good)

// 🔹 Initialize Express app
const app = express();

// Allow all origins (dev) or restrict via .env
const corsOrigin = process.env.CORS_ALLOWED_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));

// Parse JSON requests
app.use(express.json());

// 🔹 Mount all routes under /api
app.use('/api', routes);

// 🔹 Health check route for quick testing
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 🔹 Start the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 ExamSeat backend listening on port ${port}`);
});

// Optional: confirm DB connectivity at startup (for debugging)
(async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('✅ Database connection OK');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
  }
})();
