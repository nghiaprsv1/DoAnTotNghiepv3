import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Soft-auth guard: parses the JWT into `req.user` when the request carries
 * one, but never blocks the request. Use on public routes that want to
 * tailor the response for the owner / authenticated viewer (e.g. show
 * private fields when viewing your own profile).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = unknown>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    // Always allow the request through; surface user only if successfully verified.
    return user || undefined;
  }
}
