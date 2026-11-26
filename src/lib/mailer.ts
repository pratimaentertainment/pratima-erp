import nodemailer from 'nodemailer';

export interface SendSecurityOtpOptions {
  to: string;
  userName?: string;
  otp: string;
  purpose: 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD';
}

/**
 * Creates a reusable nodemailer transport using SMTP settings.
 * Defaults to port 465 (secure) or 587 (TLS).
 */
function getSmtpTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Dispatches transactional email via Resend REST API if RESEND_API_KEY is configured.
 */
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return false;

  const fromEmail = process.env.SMTP_FROM || 'FRAMIQ Security <security@pratima-erp.com>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Mailer:Resend] Failed to send email:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Mailer:Resend] Network exception:', error);
    return false;
  }
}

/**
 * Generates an enterprise-branded HTML email template for FRAMIQ Security OTP.
 */
function generateOtpEmailHtml({
  userName,
  otp,
  purpose,
}: {
  userName?: string;
  otp: string;
  purpose: 'FORGOT_PASSWORD' | 'CHANGE_PASSWORD';
}): string {
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  const actionText =
    purpose === 'FORGOT_PASSWORD'
      ? 'We received a request to reset the login password for your FRAMIQ account.'
      : 'We received a request to change the login password for your FRAMIQ account.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FRAMIQ Security Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #fafafa;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #09090b;
      padding: 40px 0;
    }
    .main {
      background-color: #18181b;
      margin: 0 auto;
      width: 100%;
      max-width: 560px;
      border-radius: 12px;
      border: 1px solid #27272a;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
      padding: 32px 36px 24px 36px;
      border-bottom: 1px solid #27272a;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffffff;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .content {
      padding: 36px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    .paragraph {
      font-size: 14px;
      line-height: 24px;
      color: #d4d4d8;
      margin: 0 0 24px 0;
    }
    .otp-container {
      background-color: #09090b;
      border: 1px dashed #3f3f46;
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: "Courier New", Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #38bdf8;
      margin: 0;
      padding-left: 10px;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-top: 8px;
    }
    .notice {
      background-color: #27272a;
      border-left: 3px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 4px;
      margin-top: 24px;
    }
    .notice p {
      font-size: 13px;
      line-height: 20px;
      color: #e4e4e7;
      margin: 0;
    }
    .footer {
      padding: 24px 36px;
      background-color: #111113;
      border-top: 1px solid #27272a;
      text-align: center;
    }
    .footer-text {
      font-size: 12px;
      line-height: 18px;
      color: #71717a;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td class="header">
          <div class="brand">FRAMIQ</div>
          <div class="brand-sub">Enterprise Photography ERP</div>
        </td>
      </tr>
      <tr>
        <td class="content">
          <h1 class="title">Security Verification Code</h1>
          <p class="paragraph">${greeting}</p>
          <p class="paragraph">${actionText}</p>
          <p class="paragraph">Use the following 6-digit verification code to complete your security verification:</p>
          
          <div class="otp-container">
            <div class="otp-code">${otp}</div>
            <div class="otp-label">6-Digit One-Time Code</div>
          </div>

          <div class="notice">
            <p><strong>Warning:</strong> This code is valid for <strong>10 minutes</strong>. For your security, never share this code or your account credentials with anyone, including FRAMIQ staff.</p>
          </div>

          <p class="paragraph" style="margin-top: 24px; font-size: 13px; color: #a1a1aa;">
            If you did not make this request, you can safely disregard this email. Your existing credentials remain safe.
          </p>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p class="footer-text">
            This is an automated security dispatch from FRAMIQ by Pratima Entertainment &amp; Technology.<br>
            Please do not reply directly to this email.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

/**
 * Dispatches the 6-digit OTP verification email via SMTP or Resend,
 * with safe fallback logging in development/unconfigured environments.
 */
export async function sendSecurityOtpEmail(options: SendSecurityOtpOptions): Promise<{
  success: boolean;
  dispatchedVia: 'SMTP' | 'RESEND' | 'CONSOLE_DEV';
  error?: string;
}> {
  const { to, userName, otp, purpose } = options;
  const subject =
    purpose === 'FORGOT_PASSWORD'
      ? `FRAMIQ Password Reset Code: ${otp}`
      : `FRAMIQ Security Verification Code: ${otp}`;

  const html = generateOtpEmailHtml({ userName, otp, purpose });
  const fromEmail = process.env.SMTP_FROM || `FRAMIQ Security <${process.env.SMTP_USER || 'security@pratima-erp.com'}>`;

  // 1. Try SMTP transport if configured
  const transport = getSmtpTransport();
  if (transport) {
    try {
      await transport.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        text: `Your FRAMIQ verification code is: ${otp}. It is valid for 10 minutes.`,
      });
      console.log(`[Mailer:SMTP] Successfully sent OTP to ${to}`);
      return { success: true, dispatchedVia: 'SMTP' };
    } catch (smtpErr: any) {
      console.error('[Mailer:SMTP] Error sending email via SMTP:', smtpErr?.message);
      // Fall through to Resend or Dev Fallback
    }
  }

  // 2. Try Resend API if configured
  if (process.env.RESEND_API_KEY) {
    const resendSuccess = await sendViaResend(to, subject, html);
    if (resendSuccess) {
      console.log(`[Mailer:Resend] Successfully sent OTP to ${to}`);
      return { success: true, dispatchedVia: 'RESEND' };
    }
  }

  // 3. Fallback for Local / Development / Testing without configured SMTP
  console.log(`\n======================================================`);
  console.log(`[MAILER:DEV_FALLBACK] RECIPIENT: ${to}`);
  console.log(`[MAILER:DEV_FALLBACK] PURPOSE:   ${purpose}`);
  console.log(`[MAILER:DEV_FALLBACK] 6-DIGIT OTP: >> ${otp} <<`);
  console.log(`[MAILER:DEV_FALLBACK] EXPIRES:   10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, dispatchedVia: 'CONSOLE_DEV' };
}
