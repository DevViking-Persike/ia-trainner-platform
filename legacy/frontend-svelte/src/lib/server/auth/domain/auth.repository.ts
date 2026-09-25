import type { AuthUserInfo } from './auth.types';

export interface AuthRepository {
  login(email: string, senha: string): Promise<{ token: string; user: AuthUserInfo }>;
  register(nome: string, email: string, senha: string): Promise<{ token: string; user: AuthUserInfo }>;
  verifySession(token: string): Promise<AuthUserInfo>;
  resendVerification(email: string): Promise<boolean>;
}
