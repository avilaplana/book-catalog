import {
  AuthExpired,
  NetworkError,
  Unauthorized,
  createApiClient,
  type ApiClientDeps,
  type TokenPair,
} from '../client';

const BASE = 'http://api.test';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type FetchHarness = {
  fetch: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
};

function makeFetch(
  responses: Array<Response | Error | (() => Response | Promise<Response>)>,
): FetchHarness {
  const calls: FetchHarness['calls'] = [];
  let i = 0;
  const fn = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const r = responses[i++];
    if (r instanceof Error) throw r;
    if (typeof r === 'function') return await r();
    return r;
  });
  return { fetch: fn as FetchHarness['fetch'], calls };
}

function makeDeps(overrides: Partial<ApiClientDeps> & Pick<ApiClientDeps, 'fetchImpl'>): ApiClientDeps {
  return {
    baseUrl: BASE,
    getAccessToken: () => 'access-1',
    getRefreshToken: () => 'refresh-1',
    onTokensRefreshed: jest.fn(),
    onAuthExpired: jest.fn(),
    ...overrides,
  };
}

function authHeader(init: RequestInit | undefined): string | null {
  const headers = new Headers(init?.headers);
  return headers.get('Authorization');
}

describe('ApiClient.request', () => {
  test('happy path: returns parsed JSON and sends bearer header', async () => {
    const { fetch, calls } = makeFetch([jsonResponse({ items: [] })]);
    const client = createApiClient(makeDeps({ fetchImpl: fetch }));

    const body = await client.request<{ items: unknown[] }>('/v1/library/books');

    expect(body).toEqual({ items: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${BASE}/v1/library/books`);
    expect(authHeader(calls[0].init)).toBe('Bearer access-1');
  });

  test('omits bearer header when no access token is available', async () => {
    const { fetch, calls } = makeFetch([jsonResponse({ ok: true })]);
    const client = createApiClient(
      makeDeps({ fetchImpl: fetch, getAccessToken: () => null }),
    );

    await client.request('/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: 'g' }),
    });

    expect(authHeader(calls[0].init)).toBeNull();
  });

  test('sets Content-Type to application/json when sending a body', async () => {
    const { fetch, calls } = makeFetch([jsonResponse({ ok: true })]);
    const client = createApiClient(makeDeps({ fetchImpl: fetch }));

    await client.request('/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: 'g' }),
    });

    const headers = new Headers(calls[0].init?.headers);
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  test('401 with stored access: refreshes, retries, returns body, notifies new pair', async () => {
    const newPair: TokenPair = {
      access_token: 'access-2',
      refresh_token: 'refresh-2',
    };
    const { fetch, calls } = makeFetch([
      jsonResponse({ title: 'Invalid token' }, 401),
      jsonResponse(newPair),
      jsonResponse({ items: [{ id: 'b' }] }),
    ]);
    const onTokensRefreshed = jest.fn();
    const client = createApiClient(
      makeDeps({ fetchImpl: fetch, onTokensRefreshed }),
    );

    const body = await client.request<{ items: unknown[] }>('/v1/library/books');

    expect(body).toEqual({ items: [{ id: 'b' }] });
    expect(calls).toHaveLength(3);
    expect(calls[0].url).toBe(`${BASE}/v1/library/books`);
    expect(authHeader(calls[0].init)).toBe('Bearer access-1');
    expect(calls[1].url).toBe(`${BASE}/v1/auth/refresh`);
    expect(calls[2].url).toBe(`${BASE}/v1/library/books`);
    expect(authHeader(calls[2].init)).toBe('Bearer access-2');
    expect(onTokensRefreshed).toHaveBeenCalledWith(newPair);
  });

  test('401 with stored access: refresh failure calls onAuthExpired and throws AuthExpired', async () => {
    const { fetch } = makeFetch([
      jsonResponse({}, 401),
      jsonResponse({ title: 'Invalid token' }, 401),
    ]);
    const onAuthExpired = jest.fn();
    const onTokensRefreshed = jest.fn();
    const client = createApiClient(
      makeDeps({ fetchImpl: fetch, onAuthExpired, onTokensRefreshed }),
    );

    await expect(client.request('/v1/library/books')).rejects.toBeInstanceOf(
      AuthExpired,
    );
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
    expect(onTokensRefreshed).not.toHaveBeenCalled();
  });

  test('401 with stored access: refresh OK but retry still 401 throws AuthExpired and clears session', async () => {
    const { fetch } = makeFetch([
      jsonResponse({}, 401),
      jsonResponse({ access_token: 'a2', refresh_token: 'r2' }),
      jsonResponse({}, 401),
    ]);
    const onAuthExpired = jest.fn();
    const client = createApiClient(makeDeps({ fetchImpl: fetch, onAuthExpired }));

    await expect(client.request('/v1/library/books')).rejects.toBeInstanceOf(
      AuthExpired,
    );
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });

  test('401 with no stored access: throws Unauthorized, does not refresh, does not clear session', async () => {
    const { fetch, calls } = makeFetch([jsonResponse({}, 401)]);
    const onAuthExpired = jest.fn();
    const client = createApiClient(
      makeDeps({ fetchImpl: fetch, getAccessToken: () => null, onAuthExpired }),
    );

    await expect(
      client.request('/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ id_token: 'g' }),
      }),
    ).rejects.toBeInstanceOf(Unauthorized);
    expect(calls).toHaveLength(1);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  test('fetch throws → NetworkError', async () => {
    const fetch = jest.fn(async () => {
      throw new TypeError('network down');
    }) as unknown as typeof globalThis.fetch;
    const client = createApiClient(makeDeps({ fetchImpl: fetch }));

    await expect(client.request('/v1/library/books')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });

  test('5xx response → NetworkError', async () => {
    const { fetch } = makeFetch([jsonResponse({}, 503)]);
    const client = createApiClient(makeDeps({ fetchImpl: fetch }));

    await expect(client.request('/v1/library/books')).rejects.toBeInstanceOf(
      NetworkError,
    );
  });
});
