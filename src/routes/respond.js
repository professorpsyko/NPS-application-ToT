// src/routes/respond.js
const express = require('express');
const fs      = require('fs');
const path    = require('path');
const router  = express.Router();

const { verify }                              = require('../lib/token');
const { updateNpsResponse, hasResponded }     = require('../lib/hubspot');
const { getBrand }                            = require('../config/brands');

const neutralHtml = fs.readFileSync(
  path.join(__dirname, '../views/thank-you-neutral.html'), 'utf8'
);

function buildPromoterHtml(brandName, trustpilotUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Thank You — ${brandName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #eef0f3;
      font-family: Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 48px 40px;
      max-width: 480px;
      width: 90%;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,.08);
    }
    h1 { color: #2c3e6b; font-size: 22px; margin-bottom: 16px; }
    p  { color: #5a6a7a; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .cta {
      display: inline-block;
      background: #00b67a;
      color: #fff;
      padding: 12px 28px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
    }
    .cta:hover { background: #009e6a; }
    .countdown { color: #8896a8; font-size: 13px; margin-top: 16px; }
  </style>
</head>
<body>
<div class="card">
  <h1>Thank you for your feedback!</h1>
  <p>
    We're so glad you've had a great experience with ${brandName}.<br><br>
    If you'd like to share your experience publicly, we'd genuinely appreciate
    a review &mdash; it helps others find us.
  </p>
  <a id="trustpilot-btn" class="cta" href="${trustpilotUrl}">
    Leave a review on Trustpilot
  </a>
  <p class="countdown" id="countdown">
    Redirecting in <span id="seconds">3</span> seconds&hellip;
  </p>
</div>
<script>
  (function () {
    var url = ${JSON.stringify(trustpilotUrl)};
    var s   = 3;
    var el  = document.getElementById('seconds');
    var timer = setInterval(function () {
      s--;
      el.textContent = s;
      if (s <= 0) {
        clearInterval(timer);
        window.location.href = url;
      }
    }, 1000);
  }());
</script>
</body>
</html>`;
}

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

  const { sub: contactId, brand: brandKey, jti } = payload;

  // 3. Look up brand config
  const brand = getBrand(brandKey);
  if (!brand) {
    return res.status(400).send('This survey link is invalid.');
  }

  // 4. Replay protection — check HubSpot directly
  // If a score is already recorded for this brand, the contact already responded.
  const alreadyResponded = await hasResponded(contactId, brand);
  if (alreadyResponded) {
    return res.status(200).send(`
      <html><body style="font-family:Arial,sans-serif;text-align:center;padding:60px;">
        <h2>We already have your response!</h2>
        <p>Your feedback has been recorded. Thank you.</p>
      </body></html>
    `);
  }

  // 5. Update HubSpot
  try {
    await updateNpsResponse(contactId, score, brand);
  } catch (err) {
    console.error(`[respond] HubSpot update failed for contact ${contactId} (brand: ${brandKey}):`, err);
  }

  // 6. Redirect based on score and whether brand has a Trustpilot page
  if (score >= 9 && brand.trustpilotUrl) {
    return res.redirect(`/nps/thank-you/promoter?brand=${encodeURIComponent(brandKey)}`);
  }
  return res.redirect('/nps/thank-you/neutral');
});

router.get('/thank-you/promoter', (req, res) => {
  const brand = getBrand(req.query.brand);
  if (!brand || !brand.trustpilotUrl) {
    return res.send(neutralHtml);
  }
  res.send(buildPromoterHtml(brand.name, brand.trustpilotUrl));
});

router.get('/thank-you/neutral', (req, res) => {
  res.send(neutralHtml);
});

module.exports = router;
