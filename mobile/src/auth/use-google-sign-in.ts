import { useEffect, useRef } from 'react';
import * as Google from 'expo-auth-session/providers/google';

import {
  parseGoogleAuthResponse,
  type GoogleAuthResponse,
  type GoogleSignInResult,
} from './google-response';

export type GoogleSignInDeps = {
  webClientId: string;
  iosClientId?: string;
  androidClientId?: string;
};

export type GoogleSignInHook = {
  signIn: () => Promise<GoogleSignInResult>;
  isReady: boolean;
};

export function useGoogleSignIn(deps: GoogleSignInDeps): GoogleSignInHook {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: deps.webClientId,
    iosClientId: deps.iosClientId,
    androidClientId: deps.androidClientId,
    scopes: ['openid', 'email', 'profile'],
  });

  const pendingRef = useRef<((result: GoogleSignInResult) => void) | null>(null);

  useEffect(() => {
    const result = parseGoogleAuthResponse(response as GoogleAuthResponse | null);
    if (result === null) return;
    const resolver = pendingRef.current;
    if (resolver) {
      pendingRef.current = null;
      resolver(result);
    }
  }, [response]);

  function signIn(): Promise<GoogleSignInResult> {
    return new Promise<GoogleSignInResult>((resolve) => {
      pendingRef.current = resolve;
      void promptAsync();
    });
  }

  return { signIn, isReady: request !== null };
}
