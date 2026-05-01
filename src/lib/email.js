// src/lib/email.js
const fs   = require('fs');
const path = require('path');

const emailTemplate = fs.readFileSync(
  path.join(__dirname, '../views/email-nps.html'),
  'utf8'
);

// Lazy-loaded so cold starts of non-email routes don't pay for SendGrid init.
let sgMail = null;
function getSgMail() {
  if (!sgMail) {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }
  return sgMail;
}

function scoreUrl(baseUrl, token, score) {
  return `${baseUrl}/nps/respond?token=${encodeURIComponent(token)}&score=${score}`;
}

function buildScoreLinks(token, baseUrl) {
  return Array.from({ length: 11 }, (_, i) => `
    <td style="padding:0 4px;">
      <a href="${scoreUrl(baseUrl, token, i)}"
         style="display:inline-block;width:36px;height:36px;line-height:36px;
                text-align:center;border-radius:50%;border:1.5px solid #8896a8;
                color:#3d566e;font-family:Arial,sans-serif;font-size:14px;
                font-weight:600;text-decoration:none;background:#f0f2f5;">${i}</a>
    </td>`).join('');
}

function renderEmailHtml(firstName, token, baseUrl, brand) {
  const greeting = firstName ? `${firstName}, your` : 'Your';
  return emailTemplate
    .replaceAll('__ACCENT__',      brand.accentColor)
    .replaceAll('__LOGO_URL__',    brand.logoUrl)
    .replaceAll('__LOGO_WIDTH__',  String(brand.logoWidth))
    .replaceAll('__BRAND_NAME__',  brand.name)
    .replaceAll('__ADDRESS__',     brand.address)
    .replaceAll('__GREETING__',    greeting)
    .replaceAll('__SCORE_LINKS__', buildScoreLinks(token, baseUrl));
}

function renderEmailText(firstName, token, baseUrl, brand) {
  return [
    `Hi ${firstName || 'there'},`,
    '',
    `How likely is it that you would recommend ${brand.name} to a friend or colleague?`,
    '',
    ...Array.from({ length: 11 }, (_, i) => `${i}: ${scoreUrl(baseUrl, token, i)}`),
    '',
    '0 = Not at all likely   10 = Extremely likely',
  ].join('\n');
}

async function sendNpsEmail(to, firstName, token, brand) {
  const baseUrl = process.env.BASE_URL;

  await getSgMail().send({
    from:    { email: brand.fromEmail, name: brand.name },
    to,
    subject: 'Hey, how are we doing?',
    html: renderEmailHtml(firstName, token, baseUrl, brand),
    text: renderEmailText(firstName, token, baseUrl, brand),
  });
}

module.exports = { sendNpsEmail };
