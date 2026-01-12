import nodemailer from "nodemailer";

// 163 邮箱 SMTP 配置
const SMTP_HOST = process.env.SMTP_HOST || "smtp.163.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER;

// 创建邮件传输器
let transporter: nodemailer.Transporter | null = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  console.log(`[Email] SMTP configured with ${SMTP_HOST}:${SMTP_PORT}`);
} else {
  console.warn("[Email] SMTP credentials not set, email sending will be disabled");
}

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * 发送邮件
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!transporter) {
    console.log("[Email] Skipping email (no SMTP configured):", params.subject);
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"每日签到应用" <${FROM_EMAIL}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html || params.text,
    });
    console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return false;
  }
}

/**
 * 发送未签到提醒邮件给紧急联系人
 */
export async function sendMissedCheckInAlert(params: {
  contactName: string;
  contactEmail: string;
  userName: string;
  missedDate: string;
}): Promise<boolean> {
  const subject = `[安全提醒] 您的联系人 ${params.userName} 昨日未签到`;
  
  const text = `尊敬的 ${params.contactName}，

您被 ${params.userName} 设置为紧急联系人。

系统检测到他/她于 ${params.missedDate} 未完成每日签到。

请您及时与他/她联系确认安全。

---
此邮件由每日签到应用自动发送，请勿直接回复。`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ 安全提醒</h1>
    </div>
    <div class="content">
      <p>尊敬的 <strong>${params.contactName}</strong>，</p>
      <p>您被 <strong>${params.userName}</strong> 设置为紧急联系人。</p>
      <div class="alert-box">
        <p>⚠️ 系统检测到他/她于 <strong>${params.missedDate}</strong> 未完成每日签到。</p>
      </div>
      <p><strong>请您及时与他/她联系确认安全。</strong></p>
    </div>
    <div class="footer">
      <p>此邮件由每日签到应用自动发送，请勿直接回复。</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: params.contactEmail,
    subject,
    text,
    html,
  });
}
