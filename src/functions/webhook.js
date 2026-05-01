// src/functions/webhook.js
// HubSpot workflow webhook — POST /webhooks/hubspot
//
// HubSpot workflow body:
//   { "contactId": "{{contact.hs_object_id}}", "brand": "tot" }

const { app } = require('@azure/functions');
const crypto  = require('crypto');

const { getContact, isWithin90Days } = require('../lib/hubspot');
const { sendNpsEmail }                = require('../lib/email');
const { sign }                        = require('../lib/token');
const { getBrand, VALID_BRANDS }      = require('../config/brands');

const WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

function verifySecret(headers) {
  const incoming = headers.get('nps_webhook_secret');
  if (!incoming || !WEBHOOK_SECRET) return false;
  const a = Buffer.from(incoming);
  const b = Buffer.from(WEBHOOK_SECRET);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.http('webhookHubspot', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'webhooks/hubspot',
  handler: async (request, context) => {
    if (!verifySecret(request.headers)) {
      context.warn('[webhook] Rejected — bad secret');
      return { status: 401, jsonBody: { error: 'Unauthorized' } };
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON' } };
    }

    const contactId = String(body?.contactId || '').trim();
    const brandKey  = String(body?.brand     || '').trim();

    if (!contactId) {
      return { status: 400, jsonBody: { error: 'Missing contactId' } };
    }
    if (!VALID_BRANDS.includes(brandKey)) {
      return {
        status: 400,
        jsonBody: { error: `Invalid or missing brand. Must be one of: ${VALID_BRANDS.join(', ')}` },
      };
    }

    // Synchronous processing: typical end-to-end is well under HubSpot's 5s webhook timeout.
    try {
      const brand     = getBrand(brandKey);
      const contact   = await getContact(contactId, brand);
      const props     = contact.properties;
      const email     = props.email;
      const firstName = props.firstname || '';

      if (!email) {
        context.warn(`[webhook] Contact ${contactId} has no email — skipping (brand: ${brandKey})`);
        return { status: 200, jsonBody: { received: true, skipped: 'no-email' } };
      }

      if (isWithin90Days(props[brand.properties.date])) {
        context.log(`[webhook] Skipping — contact ${contactId} surveyed within 90 days (brand: ${brandKey})`);
        return { status: 200, jsonBody: { received: true, skipped: '90-day-cooldown' } };
      }

      const token = sign(contactId, brandKey);
      await sendNpsEmail(email, firstName, token, brand);
      context.log(`[webhook] NPS email sent → contact ${contactId} <${email}> (brand: ${brandKey})`);

      return { status: 200, jsonBody: { received: true } };

    } catch (err) {
      context.error(`[webhook] Error processing contact ${contactId} (brand: ${brandKey}):`, err);
      return { status: 500, jsonBody: { error: 'Internal error' } };
    }
  },
});
