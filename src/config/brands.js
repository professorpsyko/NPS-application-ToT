// src/config/brands.js
//
// To activate a new brand:
//   1. Set up a shared mailbox in Microsoft 365 for the brand's from address (IT).
//   2. Add the brand to the BRANDS object below.
//   3. Create a HubSpot workflow that posts the brand key to /webhooks/hubspot.

function buildProperties(key) {
  return {
    score:    `nps_score_${key}_b2c`,
    category: `nps_category_${key}_b2c`,
    date:     `nps_date_${key}_b2c`,
    trigger:  `send_nps_${key}_b2c`,
  };
}

const BRANDS = {
  tot: {
    name:          'Teachers of Tomorrow',
    fromEmail:     'nps@teachersoftomorrow.org',
    logoUrl:       `${process.env.BASE_URL}/logos/tot.png`,
    logoWidth:     200,
    address:       '2401 Fountain View Dr., Suite 700, Houston, TX 77057',
    accentColor:   '#2c3e6b',
    trustpilotUrl: 'https://www.trustpilot.com/evaluate/teachersoftomorrow.org',
    properties:    buildProperties('tot'),
  },

  // Future brands — copy into BRANDS above when activating.
  //
  // tll: {
  //   name:          'The Learning Liaisons',
  //   fromEmail:     'nps@thelearningliaisons.com',
  //   logoUrl:       `${process.env.BASE_URL}/logos/tll.png`,
  //   logoWidth:     200,
  //   address:       '2170 W State Rd 434 #376, Longwood, FL 32779',
  //   accentColor:   '#1e3a5f',
  //   trustpilotUrl: 'https://www.trustpilot.com/evaluate/thelearningliaisons.com',
  //   properties:    buildProperties('tll'),
  // },
  //
  // teach: {
  //   name:          '#TEACH',
  //   fromEmail:     'nps@trainingeducators.com',
  //   logoUrl:       `${process.env.BASE_URL}/logos/teach.svg`,
  //   logoWidth:     160,
  //   address:       '1098 Ann Arbor Rd W #279, Plymouth, MI 48170',
  //   accentColor:   '#2c3942',
  //   trustpilotUrl: null,
  //   properties:    buildProperties('teach'),
  // },
  //
  // sk12: {
  //   name:          'SimpleK12',
  //   fromEmail:     'nps@simplek12.com',
  //   logoUrl:       `${process.env.BASE_URL}/logos/sk12.svg`,
  //   logoWidth:     180,
  //   address:       '2401 S. Fountain View Drive, Suite 700, Houston, TX 77057',
  //   accentColor:   '#37768D',
  //   trustpilotUrl: null,
  //   properties:    buildProperties('sk12'),
  // },
};

const VALID_BRANDS = Object.keys(BRANDS);

function getBrand(key) {
  return BRANDS[key] || null;
}

module.exports = { getBrand, VALID_BRANDS };
