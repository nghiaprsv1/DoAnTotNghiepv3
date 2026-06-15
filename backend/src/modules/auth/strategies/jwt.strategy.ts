import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtUserPayload } from '@/common/types/jwt-payload.type';
import { UsersService } from '@/modules/user/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtUserPayload): Promise<JwtUserPayload> {
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Wrong token type');
    }
    const user = await this.users.findById(payload.sub);
    if (!user || user.isLocked) {
      throw new UnauthorizedException('User locked or removed');
    }
    return { sub: user.id, email: user.email, role: user.role, type: 'access' };
  }
}
