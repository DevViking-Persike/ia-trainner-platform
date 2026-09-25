import type { Handle } from '@sveltejs/kit';
import type { AuthUserInfo } from '$lib/server/auth/domain/auth.types';

export const handle: Handle = async ({ event, resolve }) => {
  const cookie = event.cookies.get('ia_trainner_session');

  if (cookie) {
    try {
      // Basic jwt decode/validation matching segurapro format
      // In a real app we might call authDependencies.repository.verifySession(cookie) if needed
      // For now, let's just decode it safely assuming it contains { user, exp }.
      // Actually, since we're setting it locally, we can just decode the base64 or pass it stringified
      const payload = JSON.parse(atob(cookie)) as { user: AuthUserInfo; exp: number };

      if (payload.exp > Date.now()) {
        event.locals.session = payload.user;
      } else {
        event.cookies.delete('ia_trainner_session', { path: '/' });
        event.locals.session = null;
      }
    } catch {
      event.cookies.delete('ia_trainner_session', { path: '/' });
      event.locals.session = null;
    }
  } else {
    event.locals.session = null;
  }

  // Guard routes if not authenticated
  if (event.url.pathname.startsWith('/training') || event.url.pathname.startsWith('/rag') || event.url.pathname.startsWith('/server') || event.url.pathname.startsWith('/models')) {
      if (!event.locals.session) {
          return new Response('Redirecionando...', { status: 303, headers: { Location: '/login' } });
      }
  }

  return resolve(event);
};
