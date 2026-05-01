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
    const score = parseInt(request.query.get('score'), 10);
    if (isNaN(score) || score < 0 || score > 10) {
      return { status: 400, body: 'Invalid score.' };
    }

    let payload;
    try {
      payload = verify(request.query.get('token'));
    } catch (err) {
      const body = err.message === 'TOKEN_EXPIRED'
        ? 'This survey link has expired. Please contact us if you need a new one.'
        : 'This survey link is invalid.';
      return { status: 400, body };
    }

    const { sub: contactId, brand: brandKey } = payload;

    const brand = getBrand(brandKey);
    if (!brand) {
      return { status: 400, body: 'This survey link is invalid.' };
    }

    // Replay protection: HubSpot is the store. A populated score field means
    // this contact already responded — silently route to the same thank-you page.
    if (await hasResponded(contactId, brand)) {
      return { status: 302, headers: { Location: '/nps/thank-you/neutral' } };
    }

    try {
      await updateNpsResponse(contactId, score, brand);
    } catch (err) {
      context.error(`[respond] HubSpot update failed for contact ${contactId} (brand: ${brandKey}):`, err);
    }

    if (score >= 9 && brand.trustpilotUrl) {
      return {
        status: 302,
        headers: { Location: `/nps/thank-you/promoter?brand=${encodeURIComponent(brandKey)}` },
      };
    }
    return { status: 302, headers: { Location: '/nps/thank-you/neutral' } };
  },
});
