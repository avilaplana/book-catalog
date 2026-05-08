export type GoogleAuthResponse =
  | {
      type: 'success';
      authentication: { idToken?: string | null } | null;
      params: { id_token?: string };
    }
  | { type: 'cancel' }
  | { type: 'dismiss' }
  | { type: 'error'; error?: { message?: string } | null };

export type GoogleSignInResult =
  | { kind: 'success'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'error'; message: string };

export function parseGoogleAuthResponse(
  response: GoogleAuthResponse | null,
): GoogleSignInResult | null {
  if (response === null) return null;
  switch (response.type) {
    case 'success': {
      const idToken =
        response.authentication?.idToken ?? response.params?.id_token ?? null;
      if (!idToken) {
        return { kind: 'error', message: 'Missing id_token in Google response' };
      }
      return { kind: 'success', idToken };
    }
    case 'cancel':
    case 'dismiss':
      return { kind: 'cancelled' };
    case 'error':
      return {
        kind: 'error',
        message: response.error?.message ?? 'Google auth error',
      };
  }
}
