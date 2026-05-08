import { useCallback, useMemo } from 'react';

import {
  NetworkError,
  Unauthorized,
  createApiClient,
  type TokenPair,
} from './src/api/client';
import { exchangeRefreshToken } from './src/api/refresh';
import { secureStoreAdapter } from './src/auth/secure-store';
import { AuthSession } from './src/auth/session';
import { useGoogleSignIn } from './src/auth/use-google-sign-in';
import { NavRoot, type NavRootDeps } from './src/navigation/NavRoot';
import type { LoginOutcome } from './src/screens/LoginScreen';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export default function App() {
  const session = useMemo(() => new AuthSession(secureStoreAdapter), []);

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: BASE_URL,
        getAccessToken: () => session.getAccessToken(),
        getRefreshToken: () => session.getRefreshToken(),
        onTokensRefreshed: (pair) => {
          void session.setTokens(pair);
        },
        onAuthExpired: () => {
          void session.clear();
        },
      }),
    [session],
  );

  const googleSignIn = useGoogleSignIn({ webClientId: WEB_CLIENT_ID });

  const signIn = useCallback(async (): Promise<LoginOutcome> => {
    const result = await googleSignIn.signIn();
    if (result.kind === 'cancelled') return { status: 'cancelled' };
    if (result.kind === 'error') {
      return { status: 'error', message: result.message };
    }
    try {
      const pair = await apiClient.request<TokenPair>('/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: result.idToken }),
      });
      await session.setTokens(pair);
      return { status: 'ok' };
    } catch (e) {
      if (e instanceof Unauthorized) {
        return {
          status: 'error',
          message: 'Google sign-in was rejected by the server.',
        };
      }
      if (e instanceof NetworkError) {
        return {
          status: 'error',
          message: 'Could not reach the server. Try again.',
        };
      }
      throw e;
    }
  }, [apiClient, googleSignIn, session]);

  const loadBooks = useCallback(
    () => apiClient.request<unknown[]>('/v1/library/books'),
    [apiClient],
  );

  const exchangeRefresh = useCallback(
    (refreshToken: string) => exchangeRefreshToken(BASE_URL, refreshToken),
    [],
  );

  const deps: NavRootDeps = useMemo(
    () => ({ session, signIn, loadBooks, exchangeRefresh }),
    [session, signIn, loadBooks, exchangeRefresh],
  );

  return <NavRoot deps={deps} />;
}
