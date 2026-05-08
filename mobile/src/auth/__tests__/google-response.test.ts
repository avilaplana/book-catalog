import {
  parseGoogleAuthResponse,
  type GoogleAuthResponse,
} from '../google-response';

describe('parseGoogleAuthResponse', () => {
  test('null response → null (still pending)', () => {
    expect(parseGoogleAuthResponse(null)).toBeNull();
  });

  test('success with authentication.idToken → success result', () => {
    const response: GoogleAuthResponse = {
      type: 'success',
      authentication: { idToken: 'id-tok-123' },
      params: {},
    };

    expect(parseGoogleAuthResponse(response)).toEqual({
      kind: 'success',
      idToken: 'id-tok-123',
    });
  });

  test('success with id_token only in params → success result', () => {
    const response: GoogleAuthResponse = {
      type: 'success',
      authentication: null,
      params: { id_token: 'id-tok-from-params' },
    };

    expect(parseGoogleAuthResponse(response)).toEqual({
      kind: 'success',
      idToken: 'id-tok-from-params',
    });
  });

  test('success with no idToken anywhere → error', () => {
    const response: GoogleAuthResponse = {
      type: 'success',
      authentication: null,
      params: {},
    };

    expect(parseGoogleAuthResponse(response)).toEqual({
      kind: 'error',
      message: 'Missing id_token in Google response',
    });
  });

  test('cancel → cancelled', () => {
    expect(parseGoogleAuthResponse({ type: 'cancel' })).toEqual({
      kind: 'cancelled',
    });
  });

  test('dismiss → cancelled', () => {
    expect(parseGoogleAuthResponse({ type: 'dismiss' })).toEqual({
      kind: 'cancelled',
    });
  });

  test('error with message → error with that message', () => {
    expect(
      parseGoogleAuthResponse({
        type: 'error',
        error: { message: 'invalid_request' },
      }),
    ).toEqual({ kind: 'error', message: 'invalid_request' });
  });

  test('error with no message → error with default message', () => {
    expect(parseGoogleAuthResponse({ type: 'error' })).toEqual({
      kind: 'error',
      message: 'Google auth error',
    });
  });
});
