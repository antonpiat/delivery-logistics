import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('mail.host');
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');

    if (host && user && password) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('mail.port'),
        auth: { user, pass: password },
      });
      this.logger.log('Mail transporter initialized');
    } else {
      this.logger.warn('Mail credentials not configured — email sending disabled');
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    this.ensureTransporter();

    const verifyUrl = this.buildActionUrl('verify-email', token);

    await this.transporter!.sendMail({
      from: this.configService.getOrThrow<string>('mail.from'),
      to,
      subject: 'Verify your email address',
      html: `
        <h2>Welcome to Delivery Logistics</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verifyUrl}">Verify Email</a></p>
        <p>Or copy this link into your browser:</p>
        <p>${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you did not create an account, you can ignore this email.</p>
      `,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.ensureTransporter();

    const resetUrl = this.buildActionUrl('reset-password', token);

    await this.transporter!.sendMail({
      from: this.configService.getOrThrow<string>('mail.from'),
      to,
      subject: 'Reset your password',
      html: `
        <h2>Password Reset</h2>
        <p>You requested to reset your password. Open the link below to choose a new password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>Or copy this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you did not request a password reset, you can ignore this email.</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }

  private ensureTransporter(): void {
    if (!this.transporter) {
      throw new ServiceUnavailableException('Email service is not configured');
    }
  }

  private buildActionUrl(action: string, token: string): string {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');

    if (frontendUrl) {
      return `${frontendUrl.replace(/\/$/, '')}/${action}?token=${token}`;
    }

    if (action === 'verify-email') {
      return `${this.buildApiUrl('/auth/verify-email')}?token=${token}`;
    }

    const apiPrefix =
      this.configService.get<string>('app.apiPrefix') ?? 'api/v1';
    const appUrl =
      this.configService.get<string>('app.url') ?? 'http://localhost:3000';
    return `${appUrl}/${apiPrefix}/auth/reset-password?token=${token}`;
  }

  private buildApiUrl(path: string): string {
    const appUrl =
      this.configService.get<string>('app.url') ?? 'http://localhost:3000';
    const apiPrefix =
      this.configService.get<string>('app.apiPrefix') ?? 'api/v1';
    return `${appUrl}/${apiPrefix}${path}`;
  }
}
