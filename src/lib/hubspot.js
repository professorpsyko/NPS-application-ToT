// src/lib/hubspot.js

const TOKEN          = process.env.HUBSPOT_ACCESS_TOKEN;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function hubspotRequest(method, path, body) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HubSpot ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

// HubSpot date picker fields require a Unix timestamp in ms at midnight UTC.
function toHubSpotDate(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function isWithin90Days(dateValue) {
  if (!dateValue) return false;
  const ts = Number(dateValue);
  if (isNaN(ts)) return false;
  return (Date.now() - ts) < NINETY_DAYS_MS;
}

async function getContact(contactId, brand) {
  const props = ['email', 'firstname', brand.properties.trigger, brand.properties.date].join(',');
  return hubspotRequest('GET', `/crm/v3/objects/contacts/${contactId}?properties=${props}`);
}

async function updateNpsResponse(contactId, score, brand) {
  const category =
    score >= 9 ? 'Promoter' :
    score >= 7 ? 'Passive'  :
                 'Detractor';

  await hubspotRequest('PATCH', `/crm/v3/objects/contacts/${contactId}`, {
    properties: {
      [brand.properties.score]:    String(score),
      [brand.properties.category]: category,
      [brand.properties.date]:     toHubSpotDate(new Date()),
      // Empty string clears a single-checkbox field. "false"/null leave a value behind.
      [brand.properties.trigger]:  '',
    },
  });

  return category;
}

// HubSpot is the replay-protection store: a populated score field means the
// contact already responded for this brand on this record.
async function hasResponded(contactId, brand) {
  const result = await hubspotRequest(
    'GET',
    `/crm/v3/objects/contacts/${contactId}?properties=${brand.properties.score}`
  );
  const score = result.properties?.[brand.properties.score];
  return score != null && score !== '';
}

module.exports = { getContact, updateNpsResponse, isWithin90Days, hasResponded };
