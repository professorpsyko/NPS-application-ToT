// src/config/brands.js
// Called as a function so BASE_URL is always read from env at call time.

const VALID_BRANDS = ['tot', 'tll', 'teach', 'sk12'];

function getBrand(key) {
  const base = process.env.BASE_URL || '';

  const brands = {
    tot: {
      name:         'Teachers of Tomorrow',
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
      name:         'The Learning Liaisons',
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
      name:         '#TEACH',
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
      name:         'SimpleK12',
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
