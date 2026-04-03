// src/lib/hubspot.js
const https = require('https');

const TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// HubSpot property that triggers NPS send
const NPS_TRIGGER_PROPERTY = 'send_nps_tot_b2c';

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

// HubSpot property internal names (confirmed from Property Settings)
const NPS_SCORE_PROPERTY    = 'nps_score_tot_b2c';     // field type: Number
const NPS_CATEGORY_PROPERTY = 'nps_category_tot_b2c';  // field type: Single-line text (create this if not yet done)
const NPS_DATE_PROPERTY     = 'nps_date_tot_b2c';      // field type: Date picker

// HubSpot date picker fields require a Unix timestamp in milliseconds at midnight UTC.
// Sending a YYYY-MM-DD string will be silently rejected by the API.
function toHubSpotDate(date) {
  const d = new Date(date);
  // Zero out time to midnight UTC
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime(); // e.g. 1743638400000
}

// Fetch contact to get email + first name
async function getContact(contactId) {
  return hubspotRequest(
    'GET',
    `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,${NPS_TRIGGER_PROPERTY}`
  );
}

// Update NPS fields and clear the trigger checkbox
async function updateNpsResponse(contactId, score) {
  const category =
    score >= 9 ? 'Promoter' :
    score >= 7 ? 'Passive'  :
                 'Detractor';

  const properties = {
    [NPS_SCORE_PROPERTY]:    String(score),
    [NPS_CATEGORY_PROPERTY]: category,
    // Date picker: must be Unix ms timestamp at midnight UTC — NOT a date string
    [NPS_DATE_PROPERTY]:     toHubSpotDate(new Date()),

    // Clear the trigger checkbox.
    // Empty string clears the field entirely (no "Yes"/"No" shown on the record).
    [NPS_TRIGGER_PROPERTY]:  '',
  };

  await hubspotRequest(
    'PATCH',
    `/crm/v3/objects/contacts/${contactId}`,
    { properties }
  );

  return category;
}

module.exports = { getContact, updateNpsResponse, NPS_TRIGGER_PROPERTY };
