const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// load env
dotenv.config();

// require routes (should export an Express router)
const routes = require('./routes');

const app = express();

// dev: allow all origins or set via env
const corsOrigin = process.env.CORS_ALLOWED_ORIGIN || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());

// mount API routes
// routes must be an Express Router (module.exports = router)
app.use('/api', routes);

// health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`ExamSeat backend listening on port ${port}`);
});
