import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Configuration", () => {
  it("should have SMTP credentials configured", () => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    expect(smtpUser).toBeDefined();
    expect(smtpUser).not.toBe("");
    expect(smtpPass).toBeDefined();
    expect(smtpPass).not.toBe("");
    
    console.log(`[Test] SMTP_USER is configured: ${smtpUser}`);
  });

  it("should be able to verify SMTP connection", async () => {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    if (!smtpUser || !smtpPass) {
      console.log("[Test] Skipping SMTP verification - credentials not set");
      return;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.163.com",
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
    });

    // 验证 SMTP 连接
    const verified = await transporter.verify();
    expect(verified).toBe(true);
    console.log("[Test] SMTP connection verified successfully");
  }, 15000); // 15秒超时
});
