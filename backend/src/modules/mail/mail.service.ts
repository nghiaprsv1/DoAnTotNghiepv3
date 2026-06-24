import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Thin wrapper around nodemailer. Configured via SMTP_* env vars; when those are
 * absent it falls back to logging the message to the console so local dev and
 * the grading demo still work without a real mailbox.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    this.from =
      this.config.get<string>('SMTP_FROM') ??
      `TripMate <${user ?? 'no-reply@tripmate.local'}>`;

    if (host && user && pass) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        // 465 = implicit TLS, others (587/25) = STARTTLS
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP configured (${host}:${port})`);
    } else {
      this.logger.warn(
        'SMTP not configured — verification emails will be logged to the console.',
      );
    }
  }

  /** True when a real SMTP transport is wired up. */
  get isLive(): boolean {
    return !!this.transporter;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[MAIL:DEV] To: ${to}\nSubject: ${subject}\n${stripHtml(html)}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Failed to send mail to ${to}`, err as Error);
      throw err;
    }
  }

  /** Send the 6-digit sign-up verification code. */
  async sendVerificationCode(
    to: string,
    name: string,
    code: string,
    ttlMinutes: number,
  ): Promise<void> {
    const subject = `Mã xác thực TripMate: ${code}`;
    const html = verificationEmailHtml(name, code, ttlMinutes);
    await this.send(to, subject, html);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function verificationEmailHtml(
  name: string,
  code: string,
  ttlMinutes: number,
): string {
  const safeName = escapeHtml(name || 'bạn');
  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;color:#1f1f1f">
    <h1 style="font-size:22px;color:#ab2d00;margin:0 0 8px">TripMate</h1>
    <p style="font-size:15px;line-height:1.6">Xin chào <strong>${safeName}</strong>,</p>
    <p style="font-size:15px;line-height:1.6">
      Cảm ơn bạn đã đăng ký TripMate. Hãy dùng mã dưới đây để xác thực địa chỉ email của bạn:
    </p>
    <div style="margin:24px 0;text-align:center">
      <span style="display:inline-block;font-size:34px;font-weight:800;letter-spacing:10px;color:#ab2d00;background:#fff3ee;padding:16px 28px;border-radius:14px">
        ${escapeHtml(code)}
      </span>
    </div>
    <p style="font-size:14px;color:#666;line-height:1.6">
      Mã có hiệu lực trong <strong>${ttlMinutes} phút</strong>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#999">© TripMate — Mạng xã hội du lịch Việt Nam.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c] as string,
  );
}
