import nodemailer from "nodemailer";
import { readDb, addSystemLog } from "./db.js";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends a real email if SMTP is configured, otherwise falls back to simulated/console output.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  const db = readDb();
  const config = db.config;

  const smtpHost = config.smtp_host;
  const smtpPort = config.smtp_port || 587;
  const smtpUser = config.smtp_user;
  const smtpPass = config.smtp_pass;
  const smtpFrom = config.smtp_from || "alerts@uptimepro.io";

  // If SMTP details are not configured, simulate sending
  if (!smtpHost || !smtpUser) {
    console.log(`[SIMULATED EMAIL] To: ${to}\nFrom: ${smtpFrom}\nSubject: ${subject}\nBody: ${text}`);
    addSystemLog("info", `[SIMULATED EMAIL] Dispatched to ${to}: "${subject}" (SMTP is unconfigured).`);
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // True for 465, false for others
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate verification issues
      },
    });

    const info = await transporter.sendMail({
      from: `"${config.site_title || "UptimePro"}" <${smtpFrom}>`,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br/>"),
    });

    console.log(`[SMTP EMAIL SENT] Message ID: ${info.messageId}`);
    addSystemLog("info", `SMTP Email dispatched successfully to ${to}: "${subject}".`);
    return true;
  } catch (err: any) {
    console.error("Failed to send SMTP email:", err);
    addSystemLog("error", `SMTP Email dispatch to ${to} failed: ${err.message}. (Attempting simulation fallback)`);
    // Fallback simulation in case the configured server is failing, so the app remains functional!
    console.log(`[SIMULATED FALLBACK EMAIL] To: ${to}\nFrom: ${smtpFrom}\nSubject: ${subject}\nBody: ${text}`);
    return false;
  }
}
