import { useCallback, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

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
import type { BookSearchResult } from './src/search/use-book-search';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

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

  const completeSignIn = useCallback(
    async (idToken: string): Promise<LoginOutcome> => {
      try {
        const pair = await apiClient.request<TokenPair>('/v1/auth/google', {
          method: 'POST',
          body: JSON.stringify({ id_token: idToken }),
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
    },
    [apiClient, session],
  );

  const googleSignIn = useGoogleSignIn({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    onResult: (result) => {
      if (result.kind === 'success') void completeSignIn(result.idToken);
    },
  });

  const signIn = useCallback(async (): Promise<LoginOutcome> => {
    const result = await googleSignIn.signIn();
    if (result.kind === 'cancelled') return { status: 'cancelled' };
    if (result.kind === 'error') {
      return { status: 'error', message: result.message };
    }
    return completeSignIn(result.idToken);
  }, [completeSignIn, googleSignIn]);

  const loadBooks = useCallback(
    () => apiClient.request<unknown[]>('/v1/library/books'),
    [apiClient],
  );

  const searchBooks = useCallback(
    (query: string) => {
      const params = new URLSearchParams({ q: query });
      return apiClient.request<BookSearchResult[]>(
        `/v1/books/search?${params.toString()}`,
      );
    },
    [apiClient],
  );

  const exchangeRefresh = useCallback(
    (refreshToken: string) => exchangeRefreshToken(BASE_URL, refreshToken),
    [],
  );

  const deps: NavRootDeps = useMemo(
    () => ({ session, signIn, loadBooks, searchBooks, exchangeRefresh }),
    [session, signIn, loadBooks, searchBooks, exchangeRefresh],
  );

  return <NavRoot deps={deps} />;
}
