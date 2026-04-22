// src/config/brands.js
// Called as a function so BASE_URL is always read from env at call time.

const VALID_BRANDS = ['tot', 'tll', 'teach', 'sk12'];

function getBrand(key) {
  const base = process.env.BASE_URL || '';

  const brands = {
    tot: {
      enabled:      true,
      name:         'Teachers of Tomorrow',
      fromEmail:    'nps@teachersoftomorrow.org',
      logoUrl:      'https://info.teachersoftomorrow.org/hubfs/3-Logos/Teachers%20of%20Tomorrow/ToT-Blue_Horizontal.png',
      logoWidth:    200,
      address:      '2401 Fountain View Dr., Suite 700, Houston, TX 77057',
      accentColor:  '#2c3e6b',
      trustpilotUrl: 'https://www.trustpilot.com/evaluate/teachersoftomorrow.org',
      properties: {
        score:    'nps_score_tot_b2c',
        category: 'nps_category_tot_b2c',
        date:     'nps_date_tot_b2c',
        trigger:  'send_nps_tot_b2c',
      },
    },

    tll: {
      enabled:      false, // enable once nps@thelearningliaisons.com is verified in SendGrid
      name:         'The Learning Liaisons',
      fromEmail:    'nps@thelearningliaisons.com',
      logoUrl:      `${base}/logos/tll.png`,
      logoWidth:    200,
      address:      '2170 W State Rd 434 #376, Longwood, FL 32779',
      accentColor:  '#1e3a5f',
      trustpilotUrl: 'https://www.trustpilot.com/evaluate/thelearningliaisons.com',
      properties: {
        score:    'nps_score_tll_b2c',
        category: 'nps_category_tll_b2c',
        date:     'nps_date_tll_b2c',
        trigger:  'send_nps_tll_b2c',
      },
    },

    teach: {
      enabled:      false, // enable once nps@trainingeducators.com is verified in SendGrid
      name:         '#TEACH',
      fromEmail:    'nps@trainingeducators.com',
      logoUrl:      `${base}/logos/teach.svg`,
      logoWidth:    160,
      address:      '1098 Ann Arbor Rd W #279, Plymouth, MI 48170',
      accentColor:  '#2c3942',
      trustpilotUrl: null,
      properties: {
        score:    'nps_score_teach_b2c',
        category: 'nps_category_teach_b2c',
        date:     'nps_date_teach_b2c',
        trigger:  'send_nps_teach_b2c',
      },
    },

    sk12: {
      enabled:      false, // enable once nps@simplek12.com is verified in SendGrid
      name:         'SimpleK12',
      fromEmail:    'nps@simplek12.com',
      logoUrl:      `${base}/logos/sk12.svg`,
      logoWidth:    180,
      address:      '2401 S. Fountain View Drive, Suite 700, Houston, TX 77057',
      accentColor:  '#37768D',
      trustpilotUrl: null,
      properties: {
        score:    'nps_score_sk12_b2c',
        category: 'nps_category_sk12_b2c',
        date:     'nps_date_sk12_b2c',
        trigger:  'send_nps_sk12_b2c',
      },
    },
  };

  return brands[key] || null;
}

module.exports = { getBrand, VALID_BRANDS };
