import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { RefreshToken } from '@/modules/user/entities/refresh-token.entity';
import { EmailVerification } from '@/modules/user/entities/email-verification.entity';
import { MailService } from '@/modules/mail/mail.service';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { UserRole } from '@/common/enums/user-role.enum';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
} from './dto/auth.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: User;
  tokens: AuthTokens;
}

/** OTP lifetime and abuse limits. */
const OTP_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(EmailVerification)
    private readonly emailVerifications: Repository<EmailVerification>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<{ email: string; requiresVerification: true }> {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const rounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const handle =
      dto.handle ?? this.deriveHandle(dto.email);

    const user = this.users.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
      handle,
      role: UserRole.USER,
      emailVerified: false,
    });
    await this.users.save(user);

    // Issue an OTP and email it — no login tokens until the email is verified.
    await this.issueVerificationCode(user);

    return { email: user.email, requiresVerification: true };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (user.isLocked) throw new UnauthorizedException('Account is locked');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Block sign-in until the email is confirmed.
    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Email chưa được xác thực',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    return this.issueTokens(user);
  }

  /**
   * Verify the 6-digit OTP. On success: mark the user verified, consume the
   * code, and issue login tokens so the user lands signed-in.
   */
  async verifyEmail(email: string, code: string): Promise<AuthResult> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw new BadRequestException('Tài khoản không tồn tại');
    if (user.emailVerified) {
      throw new BadRequestException('Email đã được xác thực trước đó');
    }

    const record = await this.emailVerifications.findOne({
      where: { userId: user.id, consumedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    if (!record) {
      throw new BadRequestException('Chưa có mã xác thực. Vui lòng gửi lại mã.');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Mã đã hết hạn. Vui lòng gửi lại mã mới.');
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Bạn đã nhập sai quá nhiều lần. Vui lòng gửi lại mã mới.',
      );
    }

    if (record.codeHash !== this.hashToken(code.trim())) {
      record.attempts += 1;
      await this.emailVerifications.save(record);
      const left = Math.max(0, OTP_MAX_ATTEMPTS - record.attempts);
      throw new BadRequestException(
        `Mã xác thực không đúng. Bạn còn ${left} lần thử.`,
      );
    }

    // Success
    record.consumedAt = new Date();
    await this.emailVerifications.save(record);
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    await this.users.save(user);

    return this.issueTokens(user);
  }

  /** Re-send a fresh OTP, enforcing a short cooldown to limit abuse. */
  async resendVerification(email: string): Promise<{ email: string; sent: boolean }> {
    const user = await this.users.findOne({ where: { email } });
    // Don't leak which emails exist — respond the same either way.
    if (!user || user.emailVerified) {
      return { email, sent: false };
    }

    const last = await this.emailVerifications.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });
    if (last) {
      const since = (Date.now() - last.createdAt.getTime()) / 1000;
      if (since < RESEND_COOLDOWN_SECONDS) {
        throw new BadRequestException(
          `Vui lòng đợi ${Math.ceil(RESEND_COOLDOWN_SECONDS - since)} giây trước khi gửi lại mã.`,
        );
      }
    }

    await this.issueVerificationCode(user);
    return { email: user.email, sent: true };
  }

  /** Generate a 6-digit OTP, store its hash (revoking older ones), and email it. */
  private async issueVerificationCode(user: User): Promise<void> {
    // Invalidate any outstanding codes for this user.
    await this.emailVerifications.update(
      { userId: user.id, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.emailVerifications.save(
      this.emailVerifications.create({
        userId: user.id,
        codeHash: this.hashToken(code),
        expiresAt,
      }),
    );

    try {
      await this.mail.sendVerificationCode(
        user.email,
        user.name,
        code,
        OTP_TTL_MINUTES,
      );
    } catch (err) {
      // Don't fail the whole request if mail delivery hiccups — the user can resend.
      this.logger.error(`Could not send verification email to ${user.email}`, err as Error);
    }
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    let payload: JwtUserPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtUserPayload>(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }

    const tokenHash = this.hashToken(rawToken);
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash, userId: payload.sub },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    // Rotate: revoke old, issue new
    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    const issued = await this.issueTokens(user);
    return issued.tokens;
  }

  async logout(userId: string, rawToken?: string): Promise<void> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshTokens.update(
        { tokenHash, userId },
        { revokedAt: new Date() },
      );
    } else {
      await this.refreshTokens.update(
        { userId, revokedAt: undefined },
        { revokedAt: new Date() },
      );
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Old password incorrect');
    const rounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    await this.users.save(user);
  }

  /** Issue access + refresh tokens, persist hashed refresh, strip password from user. */
  private async issueTokens(user: User): Promise<AuthResult> {
    const basePayload: JwtUserPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(
      { ...basePayload, type: 'access' },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { ...basePayload, type: 'refresh' },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );

    // Persist hashed refresh
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.refreshTokens.save(
      this.refreshTokens.create({ userId: user.id, tokenHash, expiresAt }),
    );
    // GC very-old tokens (best-effort)
    await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });

    const safeUser = { ...user };
    delete (safeUser as Partial<User>).passwordHash;
    return { user: safeUser, tokens: { accessToken, refreshToken } };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private deriveHandle(email: string): string {
    const base = email.split('@')[0].replace(/[^a-z0-9._-]/gi, '').toLowerCase();
    const suffix = randomBytes(2).toString('hex');
    return `${base}.${suffix}`.slice(0, 30);
  }
}
