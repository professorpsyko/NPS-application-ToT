// src/lib/token.js
const crypto = require('crypto');

const SECRET = process.env.TOKEN_SECRET;
const TTL    = parseInt(process.env.TOKEN_TTL_SECONDS, 10);

// brand is stored in the token so the respond route knows which HubSpot
// properties to update without trusting a query parameter.
function sign(contactId, brand) {
  const payload = {
    sub:   contactId,
    brand,
    iat:   Math.floor(Date.now() / 1000),
    jti:   crypto.randomBytes(16).toString('hex'),
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig     = crypto
    .createHmac('sha256', SECRET)
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${sig}`;
}

function verify(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) throw new Error('MALFORMED_TOKEN');

  const [encoded, sig] = parts;

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(encoded)
    .digest('base64url');

  const sigBuf      = Buffer.from(sig,      'base64url');
  const expectedBuf = Buffer.from(expected, 'base64url');

  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    throw new Error('INVALID_SIGNATURE');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new Error('MALFORMED_PAYLOAD');
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - payload.iat > TTL) throw new Error('TOKEN_EXPIRED');

  return payload; // { sub: contactId, brand, iat, jti }
}

module.exports = { sign, verify };
