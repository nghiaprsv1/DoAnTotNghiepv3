import { UserRole } from '../enums/user-role.enum';

/** Embedded inside both access & refresh JWTs. */
export interface JwtUserPayload {
  /** user id (uuid) */
  sub: string;
  email: string;
  role: UserRole;
  /** Token type — used to refuse access tokens at refresh endpoint. */
  type?: 'access' | 'refresh';
}
