import type { AuthRepository } from '../domain/auth.repository';

export class RegisterUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(nome: string, email: string, senha: string, confirmarSenha: string) {
    if (!nome || !email || !senha) {
      throw new Error('Todos os campos são obrigatórios.');
    }
    if (senha !== confirmarSenha) {
      throw new Error('As senhas não coincidem.');
    }
    if (senha.length < 12) {
      throw new Error('A senha deve ter pelo menos 12 caracteres.');
    }

    return this.authRepository.register(nome, email, senha);
  }
}
