export type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export type ApiClientDeps = {
  baseUrl: string;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (pair: TokenPair) => void;
  onAuthExpired: () => void;
  fetchImpl?: typeof fetch;
};

export type ApiClient = {
  request<T = unknown>(path: string, init?: RequestInit): Promise<T>;
};

export class Unauthorized extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'Unauthorized';
  }
}

export class AuthExpired extends Unauthorized {
  constructor() {
    super();
    this.name = 'AuthExpired';
  }
}

export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('NetworkError');
    this.name = 'NetworkError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export function createApiClient(deps: ApiClientDeps): ApiClient {
  const fetchImpl = deps.fetchImpl ?? fetch;

  async function call(
    path: string,
    init: RequestInit | undefined,
    accessToken: string | null,
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (init?.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetchImpl(`${deps.baseUrl}${path}`, { ...init, headers });
  }

  async function refresh(): Promise<TokenPair | null> {
    const refreshToken = deps.getRefreshToken();
    if (!refreshToken) return null;
    let response: Response;
    try {
      response = await fetchImpl(`${deps.baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      return null;
    }
    if (!response.ok) return null;
    return (await response.json()) as TokenPair;
  }

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const initialAccessToken = deps.getAccessToken();
    let response: Response;
    try {
      response = await call(path, init, initialAccessToken);
    } catch (cause) {
      throw new NetworkError(cause);
    }

    if (response.status === 401 && initialAccessToken !== null) {
      const pair = await refresh();
      if (pair === null) {
        deps.onAuthExpired();
        throw new AuthExpired();
      }
      deps.onTokensRefreshed(pair);
      try {
        response = await call(path, init, pair.access_token);
      } catch (cause) {
        throw new NetworkError(cause);
      }
      if (response.status === 401) {
        deps.onAuthExpired();
        throw new AuthExpired();
      }
    }

    if (response.status === 401) {
      throw new Unauthorized();
    }
    if (response.status >= 500 || !response.ok) {
      throw new NetworkError();
    }
    return (await response.json()) as T;
  }

  return { request };
}
