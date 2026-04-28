// src/functions/respond.js
// Score click handler — GET /nps/respond?token=...&score=N

const { app } = require('@azure/functions');

const { verify }                          = require('../lib/token');
const { updateNpsResponse, hasResponded } = require('../lib/hubspot');
const { getBrand }                        = require('../config/brands');

app.http('respond', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nps/respond',
  handler: async (request, context) => {
    const token    = request.query.get('token');
    const scoreStr = request.query.get('score');

    // 1. Validate score range before touching the token
    const score = parseInt(scoreStr, 10);
    if (isNaN(score) || score < 0 || score > 10) {
      return { status: 400, body: 'Invalid score.' };
    }

    // 2. Verify token signature and expiry
    let payload;
    try {
      payload = verify(token);
    } catch (err) {
      const messages = {
        MALFORMED_TOKEN:   'This survey link is invalid.',
        INVALID_SIGNATURE: 'This survey link is invalid.',
        MALFORMED_PAYLOAD: 'This survey link is invalid.',
        TOKEN_EXPIRED:     'This survey link has expired. Please contact us if you need a new one.',
      };
      return { status: 400, body: messages[err.message] || 'This survey link is invalid.' };
    }

    const { sub: contactId, brand: brandKey } = payload;

    // 3. Look up brand config
    const brand = getBrand(brandKey);
    if (!brand) {
      return { status: 400, body: 'This survey link is invalid.' };
    }

    // 4. Replay protection — HubSpot is the store. If a score is already
    //    recorded for this brand on this contact, the click is a duplicate.
    const alreadyResponded = await hasResponded(contactId, brand);
    if (alreadyResponded) {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: `<html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
          <h2>We already have your response!</h2>
          <p>Your feedback has been recorded. Thank you.</p>
        </body></html>`,
      };
    }

    // 5. Update HubSpot
    try {
      await updateNpsResponse(contactId, score, brand);
    } catch (err) {
      context.error(`[respond] HubSpot update failed for contact ${contactId} (brand: ${brandKey}):`, err);
    }

    // 6. Redirect based on score and whether brand has a Trustpilot page
    if (score >= 9 && brand.trustpilotUrl) {
      return {
        status: 302,
        headers: { Location: `/nps/thank-you/promoter?brand=${encodeURIComponent(brandKey)}` },
      };
    }
    return {
      status: 302,
      headers: { Location: '/nps/thank-you/neutral' },
    };
  },
});
