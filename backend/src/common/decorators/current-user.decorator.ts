import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { JwtUserPayload } from '../types/jwt-payload.type';

/** Pull the JWT user payload from the request object. */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtUserPayload }>();
    return req.user;
  },
);
