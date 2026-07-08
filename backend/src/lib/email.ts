import nodemailer from 'nodemailer';

const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM = process.env.SMTP_FROM || 'ApexQuant <noreply@apexquant.io>';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#060b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px 16px;">
  <div style="max-width:480px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.3em;text-transform:uppercase;color:#e7b949;">APEXQUANT · AI QUANT TRADING</span>
    </div>
    <div style="background:#0d1520;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:40px 36px;">
      ${content}
    </div>
    <p style="text-align:center;font-size:11px;color:#334155;margin-top:20px;line-height:1.6;">
      ApexQuant · If you didn't request this, you can safely ignore it.<br>
      &copy; 2026 ApexQuant. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`\n[EMAIL - no SMTP configured]\nTo: ${to}\nSubject: ${subject}\n`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${rawToken}`;
  await send(to, 'Verify your email address — ApexQuant', wrap(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px;">Verify your email</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
      Welcome to ApexQuant. Click the button below to verify your email address and activate your account.
    </p>
    <a href="${link}" style="display:block;padding:14px 0;text-align:center;background:linear-gradient(135deg,#f7d36d 0%,#b98522 100%);color:#060b14;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
      Verify Email Address
    </a>
    <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.6;">
      This link expires in <strong>24 hours</strong>.<br>
      Or copy this link: <span style="word-break:break-all;color:#94a3b8;">${link}</span>
    </p>
  `));
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${rawToken}`;
  await send(to, 'Reset your password — ApexQuant', wrap(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px;">Reset your password</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
      We received a request to reset the password for your ApexQuant account.
      Click the button below to choose a new password.
    </p>
    <a href="${link}" style="display:block;padding:14px 0;text-align:center;background:linear-gradient(135deg,#f7d36d 0%,#b98522 100%);color:#060b14;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
      Reset Password
    </a>
    <p style="color:#475569;font-size:12px;margin:24px 0 0;text-align:center;line-height:1.6;">
      This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore it.
    </p>
  `));
}

export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  const firstName = name ? name.trim().split(' ')[0] : 'Trader';
  await send(to, `Welcome to ApexQuant, ${firstName}!`, wrap(`
    <h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 12px;">Welcome, ${firstName}!</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 8px;">
      Your email is verified and your account is active.
      Subscribe to unlock the full AI quant trading suite — live signals, MT5 integration, risk analytics, and more.
    </p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
      No trial period — choose your plan and start trading with professional-grade AI infrastructure.
    </p>
    <a href="${APP_URL}/dashboard/licenses" style="display:block;padding:14px 0;text-align:center;background:linear-gradient(135deg,#f7d36d 0%,#b98522 100%);color:#060b14;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
      Choose Your Plan
    </a>
  `));
}
