import type { TokenPair } from '../api/client';

export const REFRESH_KEY = 'colophon.refresh_token';

export type SessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export class AuthSession {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private status: SessionStatus = 'loading';
  private listeners = new Set<() => void>();

  constructor(private storage: SessionStorage) {}

  getStatus(): SessionStatus {
    return this.status;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  async loadFromStorage(): Promise<void> {
    const persisted = await this.storage.getItem(REFRESH_KEY);
    if (persisted) {
      this.refreshToken = persisted;
      this.status = 'authenticated';
    } else {
      this.status = 'unauthenticated';
    }
    this.notify();
  }

  async setTokens(pair: TokenPair): Promise<void> {
    this.accessToken = pair.access_token;
    this.refreshToken = pair.refresh_token;
    this.status = 'authenticated';
    await this.storage.setItem(REFRESH_KEY, pair.refresh_token);
    this.notify();
  }

  async clear(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    this.status = 'unauthenticated';
    await this.storage.removeItem(REFRESH_KEY);
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
