// src/lib/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   465,
  secure: true,  // port 465 uses SSL directly — avoids Railway's STARTTLS block on 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function buildScoreLinks(token, baseUrl) {
  return Array.from({ length: 11 }, (_, i) => {
    const url = `${baseUrl}/nps/respond?token=${encodeURIComponent(token)}&score=${i}`;
    return `
      <td style="padding:0 4px;">
        <a href="${url}"
           style="
             display:inline-block;
             width:36px;
             height:36px;
             line-height:36px;
             text-align:center;
             border-radius:50%;
             border:1.5px solid #8896a8;
             color:#3d566e;
             font-family:Arial,sans-serif;
             font-size:14px;
             font-weight:600;
             text-decoration:none;
             background:#f0f2f5;
           ">${i}</a>
      </td>`;
  }).join('');
}

function buildHtml(firstName, token, baseUrl) {
  const scoreLinks = buildScoreLinks(token, baseUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your opinion matters</title>
</head>
<body style="margin:0;padding:0;background:#eef0f3;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f3;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Top accent bar -->
          <tr>
            <td style="background:#2c3e6b;height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding:32px 40px 8px;">
              <span style="font-family:'Georgia',serif;font-size:18px;letter-spacing:2px;
                           color:#2c3e6b;font-weight:normal;text-transform:uppercase;">
                Teachers&#x202F;of&#x202F;Tomorrow
              </span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:8px 40px 28px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#2c3e6b;">
                ${firstName ? firstName + ', your' : 'Your'} opinion matters
              </h1>
            </td>
          </tr>

          <!-- Question -->
          <tr>
            <td align="center" style="padding:0 40px 24px;">
              <p style="margin:0;font-size:15px;font-weight:700;color:#2c3e6b;
                        line-height:1.5;text-align:center;">
                How likely is it that you would recommend<br>
                Teachers of Tomorrow to a friend or colleague?
              </p>
            </td>
          </tr>

          <!-- Score buttons -->
          <tr>
            <td align="center" style="padding:0 40px 8px;">
              <table cellpadding="0" cellspacing="0">
                <tr>${scoreLinks}</tr>
              </table>
            </td>
          </tr>

          <!-- Labels -->
          <tr>
            <td style="padding:4px 48px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#8896a8;text-align:left;">
                    0 &#8211; Not at all likely
                  </td>
                  <td style="font-size:11px;color:#8896a8;text-align:right;">
                    10 &#8211; Extremely likely
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table width="520" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:20px 0 0;
                                      font-size:11px;color:#a0a8b4;line-height:1.6;">
              This survey is a service from Teachers of Tomorrow.<br>
              #TEACH &bull; 1098 Ann Arbor Rd. W., Plymouth, MI 48170 United States
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendNpsEmail(to, firstName, token) {
  const baseUrl = process.env.BASE_URL;
  const html    = buildHtml(firstName, token, baseUrl);

  await transporter.sendMail({
    from:    `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: 'Hey, how are we doing?',
    html,
    text: [
      `Hi ${firstName || 'there'},`,
      '',
      'How likely is it that you would recommend Teachers of Tomorrow to a friend or colleague?',
      '',
      ...Array.from({ length: 11 }, (_, i) => {
        const url = `${baseUrl}/nps/respond?token=${encodeURIComponent(token)}&score=${i}`;
        return `${i}: ${url}`;
      }),
      '',
      '0 = Not at all likely   10 = Extremely likely',
    ].join('\n'),
  });
}

module.exports = { sendNpsEmail };
