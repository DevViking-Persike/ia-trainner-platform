import type { AuthRepository } from '../domain/auth.repository';
import type { AuthUserInfo } from '../domain/auth.types';

export class AuthMockRepository implements AuthRepository {
  async login(email: string, senha: string): Promise<{ token: string; user: AuthUserInfo }> {
    if (email === 'teste@exemplo.com' && senha === 'Senha123!@#123') {
      return {
        token: 'mock-jwt-token',
        user: {
          id: 'user-123',
          email,
          nome: 'Usuário Teste SSR',
          instituicao: 'Universidade Federal de Testes',
          departamento: 'Ciência da Computação',
          area_pesquisa: 'LLM Fine-tuning',
          titulacao: 'Mestre',
          plano: 'Researcher',
          limite_jobs: 5
        }
      };
    }
    throw new Error('Credenciais inválidas. Tente teste@exemplo.com e Senha123!@#123');
  }

  async register(nome: string, email: string, senha: string): Promise<{ token: string; user: AuthUserInfo }> {
    return {
        token: 'mock-jwt-token-novo',
        user: {
          id: 'user-999',
          email,
          nome,
          instituicao: '',
          departamento: '',
          area_pesquisa: '',
          titulacao: 'Graduando(a)',
          plano: 'Free',
          limite_jobs: 1
        }
    };
  }

  async verifySession(token: string): Promise<AuthUserInfo> {
    if (token === 'mock-jwt-token' || token === 'mock-jwt-token-novo') {
      return {
        id: 'user-123',
        email: 'teste@exemplo.com',
        nome: 'Usuário Teste SSR',
        instituicao: 'Universidade Federal de Testes',
        departamento: 'Ciência da Computação',
        area_pesquisa: 'LLM Fine-tuning',
        titulacao: 'Mestre',
        plano: 'Researcher',
        limite_jobs: 5
      };
    }
    throw new Error('Sessão expirada ou inválida.');
  }

  async resendVerification(email: string): Promise<boolean> {
    return true;
  }
}
