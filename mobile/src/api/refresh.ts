import type { TokenPair } from './client';

export async function exchangeRefreshToken(
  baseUrl: string,
  refreshToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenPair | null> {
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/auth/refresh`, {
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
