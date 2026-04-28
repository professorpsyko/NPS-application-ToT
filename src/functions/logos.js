// src/functions/logos.js
// Static logo serving — GET /logos/{filename}
// Filenames are restricted to safe characters and a small set of extensions.

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

app.http('logos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'logos/{filename}',
  handler: async (request) => {
    const filename = request.params.filename;
    if (!VALID_FILENAME.test(filename)) {
      return { status: 400, body: 'Invalid filename' };
    }

    const filepath = path.join(__dirname, '../../public/logos', filename);
    if (!fs.existsSync(filepath)) {
      return { status: 404, body: 'Not found' };
    }

    const ext = path.extname(filename).toLowerCase();
    return {
      status: 200,
      headers: {
        'Content-Type':  CONTENT_TYPES[ext],
        'Cache-Control': 'public, max-age=86400',
      },
      body: fs.readFileSync(filepath),
    };
  },
});
