import { AuthMockRepository } from './infrastructure/auth.mock.repository';
import { AuthenticateUserUseCase } from './application/authenticate-user';
import { RegisterUserUseCase } from './application/register-user';

// In a real app with 'segurapro' logic:
// const backend = process.env.SEGURAPRO_BACKEND_PROVIDER === 'mock'
//    ? new AuthMockRepository()
//    : new AuthHttpRepository();

const authRepository = new AuthMockRepository();

export const authDependencies = {
  authenticateUser: new AuthenticateUserUseCase(authRepository),
  registerUser: new RegisterUserUseCase(authRepository),
  repository: authRepository // For session verification
};
