// src/lib/db.js
const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.error('[redis] Client error:', err));

client.connect();

// Returns true if this jti has NOT been used before (and marks it used).
// Returns false if it has already been used (replay attack).
async function consumeToken(jti, ttlSeconds) {
  const key    = `nps:jti:${jti}`;
  const result = await client.set(key, '1', {
    NX: true,        // only set if key does not exist
    EX: ttlSeconds,  // auto-expire matches token TTL
  });
  return result === 'OK'; // null means key already existed → replay
}

module.exports = { consumeToken };
