// src/functions/logos.js
// GET /logos/{filename} — static logo serving with in-memory cache.

const { app } = require('@azure/functions');
const fs      = require('fs');
const path    = require('path');

const VALID_FILENAME = /^[a-z0-9_-]+\.(png|svg|jpg|jpeg)$/i;

const CONTENT_TYPES = {
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const cache = new Map();

app.http('logos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'logos/{filename}',
  handler: async (request) => {
    const filename = request.params.filename;
    if (!VALID_FILENAME.test(filename)) {
      return { status: 400, body: 'Invalid filename' };
    }

    if (!cache.has(filename)) {
      const filepath = path.join(__dirname, '../../public/logos', filename);
      try {
        const data = fs.readFileSync(filepath);
        const ext  = path.extname(filename).toLowerCase();
        cache.set(filename, { data, contentType: CONTENT_TYPES[ext] });
      } catch (err) {
        if (err.code === 'ENOENT') return { status: 404, body: 'Not found' };
        throw err;
      }
    }

    const entry = cache.get(filename);
    return {
      status: 200,
      headers: {
        'Content-Type':  entry.contentType,
        'Cache-Control': 'public, max-age=86400',
      },
      body: entry.data,
    };
  },
});
