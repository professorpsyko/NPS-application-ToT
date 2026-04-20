// src/routes/webhook.js
const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const { getContact, isWithin90Days } = require('../lib/hubspot');
const { sendNpsEmail }               = require('../lib/email');
const { sign }                       = require('../lib/token');
const { getBrand, VALID_BRANDS }     = require('../config/brands');

const WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

function verifySecret(req) {
  const incoming = req.headers['nps_webhook_secret'];
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

// HubSpot workflow sends:
// { "contactId": "{{contact.hs_object_id}}", "brand": "tot" }
//
// Brand must be one of: tot, tll, teach, sk12
router.post('/hubspot', express.json(), async (req, res) => {
  if (!verifySecret(req)) {
    console.warn('[webhook] Rejected — bad secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const contactId = String(req.body?.contactId || '').trim();
  const brandKey  = String(req.body?.brand     || '').trim();

  if (!contactId) {
    return res.status(400).json({ error: 'Missing contactId' });
  }
  if (!brandKey || !VALID_BRANDS.includes(brandKey)) {
    return res.status(400).json({ error: `Invalid or missing brand. Must be one of: ${VALID_BRANDS.join(', ')}` });
  }

  // Respond immediately — HubSpot requires a response within 5 seconds
  res.status(200).json({ received: true });

  // Process asynchronously after responding
  try {
    const brand   = getBrand(brandKey);
    const contact = await getContact(contactId, brand);
    const props   = contact.properties;
    const email   = props.email;
    const firstName = props.firstname || '';

    if (!email) {
      console.warn(`[webhook] Contact ${contactId} has no email — skipping (brand: ${brandKey})`);
      return;
    }

    // 90-day cooldown — skip if contact was surveyed for this brand within the last 90 days
    const lastSurveyDate = props[brand.properties.date];
    if (isWithin90Days(lastSurveyDate)) {
      console.log(`[webhook] Skipping — contact ${contactId} surveyed within 90 days (brand: ${brandKey})`);
      return;
    }

    const token = sign(contactId, brandKey);
    await sendNpsEmail(email, firstName, token, brand);
    console.log(`[webhook] NPS email sent → contact ${contactId} <${email}> (brand: ${brandKey})`);

  } catch (err) {
    console.error(`[webhook] Error processing contact ${contactId} (brand: ${brandKey}):`, err);
  }
});

module.exports = router;
