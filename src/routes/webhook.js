// src/routes/webhook.js
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const { getContact } = require('../lib/hubspot');
const { sendNpsEmail } = require('../lib/email');
const { sign }         = require('../lib/token');

const WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

// HubSpot Workflow HTTP actions don't use HMAC signatures.
// We verify a shared secret sent as a custom request header instead.
function verifySecret(req) {
  const incoming = req.headers['x-webhook-secret'];
  if (!incoming || !WEBHOOK_SECRET) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(incoming),
      Buffer.from(WEBHOOK_SECRET)
    );
  } catch {
    return false;
  }
}

// HubSpot workflow sends: { "contactId": "{{contact.hs_object_id}}" }
router.post('/hubspot', express.json(), async (req, res) => {
  if (!verifySecret(req)) {
    console.warn('[webhook] Rejected — bad secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const contactId = String(req.body?.contactId || '').trim();
  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }

  // Respond immediately — HubSpot requires a response within 5 seconds
  res.status(200).json({ received: true });

  // Process asynchronously after responding
  try {
    const contact   = await getContact(contactId);
    const props     = contact.properties;
    const email     = props.email;
    const firstName = props.firstname || '';

    if (!email) {
      console.warn(`[webhook] Contact ${contactId} has no email — skipping`);
      return;
    }

    const token = sign(contactId);
    await sendNpsEmail(email, firstName, token);
    console.log(`[webhook] NPS email sent → contact ${contactId} <${email}>`);

  } catch (err) {
    console.error('[webhook] Error processing contact:', err);
  }
});

module.exports = router;
