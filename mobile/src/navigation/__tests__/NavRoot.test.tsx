import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { createNavigationContainerRef } from '@react-navigation/native';

import { NavRoot, type NavRootDeps, type StackParamList } from '../NavRoot';
import { AuthSession, REFRESH_KEY, type SessionStorage } from '../../auth/session';
import { type BookSearchResult } from '../../search/use-book-search';

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

function makeDeps(overrides: Partial<NavRootDeps> = {}): NavRootDeps {
  return {
    session: new AuthSession(memStorage()),
    signIn: jest.fn(),
    loadBooks: jest.fn().mockResolvedValue([]),
    searchBooks: jest.fn().mockResolvedValue([]),
    addBook: jest.fn().mockResolvedValue(undefined),
    exchangeRefresh: jest.fn(),
    ...overrides,
  };
}

describe('NavRoot auth flow', () => {
  test('cold start with no persisted refresh shows Login', async () => {
    const exchangeRefresh = jest.fn();
    render(<NavRoot deps={makeDeps({ exchangeRefresh })} />);

    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
    expect(exchangeRefresh).not.toHaveBeenCalled();
  });

  test('sign-in transitions from Login to empty Library', async () => {
    const session = new AuthSession(memStorage());
    const signIn = jest.fn(async () => {
      await session.setTokens({
        access_token: 'a-new',
        refresh_token: 'r-new',
      });
      return { status: 'ok' as const };
    });

    render(<NavRoot deps={makeDeps({ session, signIn })} />);

    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
    fireEvent.press(screen.getByText('Continue with Google'));

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(screen.queryByText('Continue with Google')).toBeNull();
  });

  test('relaunch with valid persisted refresh skips Login and lands on Library', async () => {
    const session = new AuthSession(
      memStorage({ [REFRESH_KEY]: 'r-stored' }),
    );
    const exchangeRefresh = jest.fn().mockResolvedValue({
      access_token: 'a-fresh',
      refresh_token: 'r-fresh',
    });
    render(<NavRoot deps={makeDeps({ session, exchangeRefresh })} />);

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(exchangeRefresh).toHaveBeenCalledWith('r-stored');
    expect(screen.queryByText('Continue with Google')).toBeNull();
  });

  test('relaunch with rejected refresh routes to Login and clears the session', async () => {
    const session = new AuthSession(memStorage({ [REFRESH_KEY]: 'r-bad' }));
    const exchangeRefresh = jest.fn().mockResolvedValue(null);
    render(<NavRoot deps={makeDeps({ session, exchangeRefresh })} />);

    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
    expect(exchangeRefresh).toHaveBeenCalledWith('r-bad');
    expect(session.getRefreshToken()).toBeNull();
  });

  test('clearing the session while on Library routes back to Login', async () => {
    const session = new AuthSession(
      memStorage({ [REFRESH_KEY]: 'r-stored' }),
    );
    const exchangeRefresh = jest.fn().mockResolvedValue({
      access_token: 'a-fresh',
      refresh_token: 'r-fresh',
    });
    render(<NavRoot deps={makeDeps({ session, exchangeRefresh })} />);
    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );

    await session.clear();

    await waitFor(() =>
      expect(screen.getByText('Continue with Google')).toBeTruthy(),
    );
  });
});

describe('NavRoot search flow', () => {
  const sampleResults: BookSearchResult[] = [
    {
      google_books_id: 'vol-1',
      title: 'Ulysses',
      author: 'James Joyce',
      cover_url: null,
      description: 'A modernist novel about Leopold Bloom.',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('Library → Find a book → query → result → Preview → back preserves Search state', async () => {
    const session = new AuthSession(memStorage({ [REFRESH_KEY]: 'r-stored' }));
    const exchangeRefresh = jest.fn().mockResolvedValue({
      access_token: 'a-fresh',
      refresh_token: 'r-fresh',
    });
    const searchBooks = jest.fn().mockResolvedValue(sampleResults);
    const navigationRef = createNavigationContainerRef<StackParamList>();

    render(
      <NavRoot
        deps={makeDeps({ session, exchangeRefresh, searchBooks })}
        navigationRef={navigationRef}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );

    fireEvent.press(screen.getByText('Find a book'));

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/title or author/i)).toBeTruthy(),
    );

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'ulysses',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('Ulysses')).toBeTruthy());

    fireEvent.press(screen.getByText('Ulysses'));

    await waitFor(() =>
      expect(
        screen.getByText('A modernist novel about Leopold Bloom.'),
      ).toBeTruthy(),
    );

    await act(async () => {
      navigationRef.goBack();
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/title or author/i);
      expect(input.props.value).toBe('ulysses');
    });
    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(searchBooks).toHaveBeenCalledTimes(1);
  });
});
