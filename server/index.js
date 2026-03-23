const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const extractRoutes = require('./routes/extract');
const recipesRoutes = require('./routes/recipes');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/extract', extractRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/upload', uploadRoutes);

const clientDist = path.join(__dirname, '../client/dist');
const clientIndex = path.join(clientDist, 'index.html');
if (fs.existsSync(clientIndex)) {
  app.use(express.static(clientDist, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(clientIndex, (err) => next(err));
  });
}

const host = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, host, () => {
  console.log(`🍳 Stein's Kitchen server running on http://${host}:${PORT}`);
  if (!(process.env.ANTHROPIC_API_KEY || '').trim()) {
    console.warn('⚠️  ANTHROPIC_API_KEY is empty — URL/image recipe extraction will fail.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Stop the other process (e.g. an old server) or set PORT to another value in .env.`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
