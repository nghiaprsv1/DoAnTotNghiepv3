/**
 * Mirror of FE `UserRole` from src/types/user.ts
 */
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  GUIDE = 'guide',
  USER = 'user',
}

/** Helper used by guards & gating logic. */
export const isGuide = (role: UserRole): boolean =>
  role === UserRole.GUIDE || role === UserRole.ADMIN;
