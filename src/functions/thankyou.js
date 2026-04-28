// src/functions/thankyou.js
// Thank-you pages
//   GET /nps/thank-you/promoter?brand=tot   (with Trustpilot redirect)
//   GET /nps/thank-you/neutral              (generic)

const { app } = require('@azure/functions');
const fs      = require('fs');
const path    = require('path');

const { getBrand } = require('../config/brands');

const neutralHtml = fs.readFileSync(
  path.join(__dirname, '../views/thank-you-neutral.html'),
  'utf8'
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

app.http('thankYouPromoter', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nps/thank-you/promoter',
  handler: async (request) => {
    const brandKey = request.query.get('brand');
    const brand    = getBrand(brandKey);
    if (!brand || !brand.trustpilotUrl) {
      return {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
        body: neutralHtml,
      };
    }
    return {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: buildPromoterHtml(brand.name, brand.trustpilotUrl),
    };
  },
});

app.http('thankYouNeutral', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nps/thank-you/neutral',
  handler: async () => {
    return {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
      body: neutralHtml,
    };
  },
});
