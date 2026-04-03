// src/routes/webhook.js
const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();

const { getContact, NPS_TRIGGER_PROPERTY } = require('../lib/hubspot');
const { sendNpsEmail } = require('../lib/email');
const { sign }         = require('../lib/token');

const WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

// HubSpot v3 signature verification:
// HMAC-SHA256 of (clientSecret + httpMethod + fullUrl + rawBody)
function verifyHubSpotSignature(req) {
  const sig = req.headers['x-hubspot-signature-v3'];
  if (!sig) return false;

  const url     = `${process.env.BASE_URL}${req.originalUrl}`;
  const rawBody = req.rawBody;
  const toSign  = `POST${url}${rawBody}`;

  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(toSign)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expected)
    );
  } catch {
    // Buffer lengths differ if sig is garbage — treat as invalid
    return false;
  }
}

router.post('/hubspot', express.raw({ type: '*/*' }), async (req, res) => {
  req.rawBody = req.body.toString('utf8');

  if (!verifyHubSpotSignature(req)) {
    console.warn('[webhook] Rejected — bad signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let events;
  try {
    events = JSON.parse(req.rawBody);
  } catch {
    return res.status(400).json({ error: 'Bad JSON' });
  }

  // Respond immediately — HubSpot requires < 5 s
  res.status(200).json({ received: true });

  for (const event of events) {
    try {
      // Only act on send_nps_tot_b2c being set to true (HubSpot sends "true" as string)
      if (event.subscriptionType !== 'contact.propertyChange') continue;
      if (event.propertyName     !== NPS_TRIGGER_PROPERTY)     continue;

      // HubSpot single-checkbox "Yes" sends propertyValue = "true"
      if (String(event.propertyValue).toLowerCase() !== 'true') continue;

      const contactId = String(event.objectId);
      const contact   = await getContact(contactId);
      const props     = contact.properties;

      const email     = props.email;
      const firstName = props.firstname || '';

      if (!email) {
        console.warn(`[webhook] Contact ${contactId} has no email — skipping`);
        continue;
      }

      const token = sign(contactId);
      await sendNpsEmail(email, firstName, token);
      console.log(`[webhook] NPS email sent → contact ${contactId} <${email}>`);

    } catch (err) {
      console.error('[webhook] Error processing event:', err);
    }
  }
});

module.exports = router;
