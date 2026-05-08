import { AuthSession, REFRESH_KEY, type SessionStorage } from '../session';

function memStorage(initial: Record<string, string> = {}): SessionStorage {
  const data = new Map(Object.entries(initial));
  return {
    async getItem(key) {
      return data.get(key) ?? null;
    },
    async setItem(key, value) {
      data.set(key, value);
    },
    async removeItem(key) {
      data.delete(key);
    },
  };
}

describe('AuthSession', () => {
  test('starts in loading status before load', () => {
    const session = new AuthSession(memStorage());

    expect(session.getStatus()).toBe('loading');
    expect(session.getAccessToken()).toBeNull();
    expect(session.getRefreshToken()).toBeNull();
  });

  test('loadFromStorage: empty storage → unauthenticated', async () => {
    const session = new AuthSession(memStorage());

    await session.loadFromStorage();

    expect(session.getStatus()).toBe('unauthenticated');
  });

  test('loadFromStorage: persisted refresh → authenticated, access still null', async () => {
    const session = new AuthSession(memStorage({ [REFRESH_KEY]: 'r1' }));

    await session.loadFromStorage();

    expect(session.getStatus()).toBe('authenticated');
    expect(session.getRefreshToken()).toBe('r1');
    expect(session.getAccessToken()).toBeNull();
  });

  test('setTokens: persists refresh, holds access in memory, status authenticated', async () => {
    const storage = memStorage();
    const session = new AuthSession(storage);

    await session.setTokens({ access_token: 'a1', refresh_token: 'r1' });

    expect(session.getStatus()).toBe('authenticated');
    expect(session.getAccessToken()).toBe('a1');
    expect(session.getRefreshToken()).toBe('r1');
    expect(await storage.getItem(REFRESH_KEY)).toBe('r1');
  });

  test('clear: removes refresh from storage, status unauthenticated', async () => {
    const storage = memStorage();
    const session = new AuthSession(storage);
    await session.setTokens({ access_token: 'a1', refresh_token: 'r1' });

    await session.clear();

    expect(session.getStatus()).toBe('unauthenticated');
    expect(session.getAccessToken()).toBeNull();
    expect(session.getRefreshToken()).toBeNull();
    expect(await storage.getItem(REFRESH_KEY)).toBeNull();
  });

  test('subscribe: listener notified on setTokens, clear, and loadFromStorage', async () => {
    const session = new AuthSession(memStorage({ [REFRESH_KEY]: 'r1' }));
    const listener = jest.fn();
    session.subscribe(listener);

    await session.loadFromStorage();
    await session.setTokens({ access_token: 'a2', refresh_token: 'r2' });
    await session.clear();

    expect(listener).toHaveBeenCalledTimes(3);
  });

  test('unsubscribe: listener no longer notified', async () => {
    const session = new AuthSession(memStorage());
    const listener = jest.fn();
    const unsub = session.subscribe(listener);
    unsub();

    await session.setTokens({ access_token: 'a1', refresh_token: 'r1' });

    expect(listener).not.toHaveBeenCalled();
  });
});
