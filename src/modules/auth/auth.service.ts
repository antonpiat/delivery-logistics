import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { MailService } from '@/infrastructure/mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@/common/enums/role.enum';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { generateToken, hashToken } from '@/common/utils/token.util';

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    let companyId = dto.companyId;

    if (dto.role === Role.ADMIN && dto.companyName) {
      const company = await this.companiesService.create({
        name: dto.companyName,
      });
      companyId = company.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = generateToken();
    const verificationExpires = this.expiresInHours(
      VERIFICATION_TOKEN_EXPIRY_HOURS,
    );

    await this.usersService.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      companyId,
      emailVerified: false,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationExpires: verificationExpires,
    });

    await this.sendEmailOrFail(
      () =>
        this.mailService.sendVerificationEmail(dto.email, verificationToken),
      'Unable to send verification email. Please try again later.',
    );

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message:
          'Email not verified. Use POST /auth/resend-verification to receive a new verification link.',
        emailVerificationRequired: true,
      });
    }

    return this.buildAuthResponse(user);
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(
      hashToken(token),
    );
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerified) {
      return {
        message: 'Email already verified',
        ...this.buildAuthResponse(user),
      };
    }

    if (
      user.emailVerificationExpires &&
      user.emailVerificationExpires < new Date()
    ) {
      throw new BadRequestException(
        'Verification token has expired. Use POST /auth/resend-verification to receive a new link.',
      );
    }

    const verifiedUser = await this.usersService.markEmailVerified(user.id);

    return {
      message: 'Email verified successfully',
      ...this.buildAuthResponse(verifiedUser),
    };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || user.emailVerified) {
      return this.genericEmailSentMessage();
    }

    const verificationToken = generateToken();
    const verificationExpires = this.expiresInHours(
      VERIFICATION_TOKEN_EXPIRY_HOURS,
    );

    await this.usersService.setVerificationToken(
      user.id,
      hashToken(verificationToken),
      verificationExpires,
    );
    await this.sendEmailOrFail(
      () => this.mailService.sendVerificationEmail(email, verificationToken),
      'Unable to send verification email. Please try again later.',
    );

    return this.genericEmailSentMessage();
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      if (!user.emailVerified) {
        await this.resendVerification(email);
      } else {
        const resetToken = generateToken();
        const resetExpires = this.expiresInHours(PASSWORD_RESET_EXPIRY_HOURS);

        await this.usersService.setPasswordResetToken(
          user.id,
          hashToken(resetToken),
          resetExpires,
        );
        await this.sendEmailOrFail(
          () => this.mailService.sendPasswordResetEmail(email, resetToken),
          'Unable to send password reset email. Please try again later.',
        );
      }
    }

    return {
      message:
        'If an account exists with this email, instructions have been sent.',
    };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.usersService.findByPasswordResetToken(
      hashToken(token),
    );
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.emailVerified) {
      throw new BadRequestException(
        'Email must be verified before resetting password.',
      );
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new BadRequestException(
        'Reset token has expired. Use POST /auth/forgot-password to request a new link.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updatedUser = await this.usersService.updatePassword(
      user.id,
      passwordHash,
    );

    return {
      message: 'Password reset successfully',
      ...this.buildAuthResponse(updatedUser),
    };
  }

  private async sendEmailOrFail(
    send: () => Promise<void>,
    message: string,
  ): Promise<void> {
    try {
      await send();
    } catch {
      throw new ServiceUnavailableException(message);
    }
  }

  private expiresInHours(hours: number): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private genericEmailSentMessage() {
    return {
      message:
        'If an unverified account exists with this email, a verification link has been sent.',
    };
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: string;
    companyId: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }
}
