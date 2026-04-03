// src/routes/respond.js
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const { verify }            = require('../lib/token');
const { consumeToken }      = require('../lib/db');
const { updateNpsResponse } = require('../lib/hubspot');

const TTL = parseInt(process.env.TOKEN_TTL_SECONDS, 10);

// Pre-render the promoter page with the Trustpilot URL baked in at startup
const promoterHtml = fs
  .readFileSync(path.join(__dirname, '../views/thank-you-promoter.html'), 'utf8')
  .replaceAll('__TRUSTPILOT_URL__', process.env.TRUSTPILOT_URL || '#');

const neutralHtml = fs
  .readFileSync(path.join(__dirname, '../views/thank-you-neutral.html'), 'utf8');

router.get('/respond', async (req, res) => {
  const { token, score: scoreStr } = req.query;

  // 1. Validate score range before touching the token
  const score = parseInt(scoreStr, 10);
  if (isNaN(score) || score < 0 || score > 10) {
    return res.status(400).send('Invalid score.');
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
    return res
      .status(400)
      .send(messages[err.message] || 'This survey link is invalid.');
  }

  const { sub: contactId, jti } = payload;

  // 3. Replay protection — one click = one response
  const consumed = await consumeToken(jti, TTL);
  if (!consumed) {
    return res.status(200).send(`
      <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
        <h2>We already have your response!</h2>
        <p>Your feedback has been recorded. Thank you.</p>
      </body></html>
    `);
  }

  // 4. Update HubSpot — clears send_nps_tot_b2c + writes score/category/date
  try {
    await updateNpsResponse(contactId, score);
  } catch (err) {
    // Token is consumed so we cannot retry safely.
    // Log for ops visibility but don't block the user.
    console.error(`[respond] HubSpot update failed for contact ${contactId}:`, err);
  }

  // 5. Redirect based on score
  if (score >= 9) {
    return res.redirect('/nps/thank-you/promoter');
  }
  return res.redirect('/nps/thank-you/neutral');
});

router.get('/thank-you/promoter', (req, res) => {
  res.send(promoterHtml);
});

router.get('/thank-you/neutral', (req, res) => {
  res.send(neutralHtml);
});

router.get('/thank-you/already-recorded', (req, res) => {
  res.status(200).send(`
    <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
      <h2>We already have your response!</h2>
      <p>Your feedback has been recorded. Thank you.</p>
    </body></html>
  `);
});

module.exports = router;
