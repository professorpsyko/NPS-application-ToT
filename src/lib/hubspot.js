// src/lib/hubspot.js
const https = require('https');

const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function hubspotRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'api.hubapi.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type':  'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`HubSpot ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// HubSpot date picker fields require a Unix timestamp in milliseconds at midnight UTC.
function toHubSpotDate(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

// Returns true if the given HubSpot date value is within the last 90 days.
function isWithin90Days(dateValue) {
  if (!dateValue) return false;
  const ts = Number(dateValue);
  if (isNaN(ts)) return false;
  return (Date.now() - ts) < NINETY_DAYS_MS;
}

// Fetch contact — reads email, firstname, and the brand's trigger + date properties.
async function getContact(contactId, brand) {
  const props = [
    'email',
    'firstname',
    brand.properties.trigger,
    brand.properties.date,
  ].join(',');

  return hubspotRequest('GET', `/crm/v3/objects/contacts/${contactId}?properties=${props}`);
}

// Write NPS score/category/date back to HubSpot and clear the trigger checkbox.
async function updateNpsResponse(contactId, score, brand) {
  const category =
    score >= 9 ? 'Promoter' :
    score >= 7 ? 'Passive'  :
                 'Detractor';

  const properties = {
    [brand.properties.score]:    String(score),
    [brand.properties.category]: category,
    [brand.properties.date]:     toHubSpotDate(new Date()),
    // Empty string clears the single-checkbox field entirely.
    [brand.properties.trigger]:  '',
  };

  await hubspotRequest(
    'PATCH',
    `/crm/v3/objects/contacts/${contactId}`,
    { properties }
  );

  return category;
}

module.exports = { getContact, updateNpsResponse, isWithin90Days };
