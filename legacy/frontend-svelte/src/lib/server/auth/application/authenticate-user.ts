import type { AuthRepository } from '../domain/auth.repository';

export class AuthenticateUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(email: string, senha: string) {
    if (!email || !senha) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    // Passa para a infraestrutura fazer a chamada de rede ou mock
    return this.authRepository.login(email, senha);
  }
}
