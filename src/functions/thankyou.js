// src/functions/thankyou.js
// GET /nps/thank-you/promoter?brand=tot   (with Trustpilot redirect)
// GET /nps/thank-you/neutral              (generic)

const { app } = require('@azure/functions');
const fs      = require('fs');
const path    = require('path');

const { getBrand } = require('../config/brands');

const promoterTemplate = fs.readFileSync(
  path.join(__dirname, '../views/thank-you-promoter.html'),
  'utf8'
);

const neutralHtml = fs.readFileSync(
  path.join(__dirname, '../views/thank-you-neutral.html'),
  'utf8'
);

function renderPromoter(brand) {
  return promoterTemplate
    .replaceAll('__TRUSTPILOT_URL__', brand.trustpilotUrl)
    .replaceAll('__BRAND_NAME__',     brand.name);
}

app.http('thankYouPromoter', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nps/thank-you/promoter',
  handler: async (request) => {
    const brand = getBrand(request.query.get('brand'));
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
      body: renderPromoter(brand),
    };
  },
});

app.http('thankYouNeutral', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'nps/thank-you/neutral',
  handler: async () => ({
    status: 200,
    headers: { 'Content-Type': 'text/html' },
    body: neutralHtml,
  }),
});
