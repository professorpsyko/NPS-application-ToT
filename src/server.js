// src/server.js
require('dotenv').config();

const express = require('express');
const path    = require('path');
const app     = express();

const webhookRouter = require('./routes/webhook');
const respondRouter = require('./routes/respond');

// Serve brand logos and other static assets
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/webhooks', webhookRouter);
app.use('/nps',      respondRouter);

// 404
app.use((req, res) => res.status(404).send('Not found'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).send('Internal error');
});

app.listen(process.env.PORT, () => {
  console.log(`NPS server running on port ${process.env.PORT}`);
});
