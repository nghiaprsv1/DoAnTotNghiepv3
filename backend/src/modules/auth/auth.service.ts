import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { RefreshToken } from '@/modules/user/entities/refresh-token.entity';
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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
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
    });
    await this.users.save(user);
    return this.issueTokens(user);
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

    return this.issueTokens(user);
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
