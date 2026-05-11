import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LibraryScreen, type LibraryBook } from '../LibraryScreen';
import { AuthExpired, NetworkError } from '../../api/client';
import { ToastProvider } from '../../ui/toast';

const ULYSSES: LibraryBook = {
  google_books_id: 'g-ulysses',
  title: 'Ulysses',
  author: 'James Joyce',
  cover_url: 'https://example.com/u.jpg',
  added_at: '2026-05-11T10:00:00Z',
};

const DUBLINERS: LibraryBook = {
  google_books_id: 'g-dubliners',
  title: 'Dubliners',
  author: 'James Joyce',
  cover_url: null,
  added_at: '2026-05-10T10:00:00Z',
};

function renderLibrary(opts: {
  loadBooks: () => Promise<LibraryBook[]>;
  onFindBook?: () => void;
}) {
  const Stack = createNativeStackNavigator();
  return render(
    <ToastProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Library">
            {() => (
              <LibraryScreen
                loadBooks={opts.loadBooks}
                onFindBook={opts.onFindBook ?? jest.fn()}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>,
  );
}

describe('LibraryScreen', () => {
  test('calls loadBooks on mount', () => {
    const loadBooks = jest.fn().mockResolvedValue([]);
    renderLibrary({ loadBooks });
    expect(loadBooks).toHaveBeenCalledTimes(1);
  });

  test('empty response renders the empty state with Find a book button', async () => {
    renderLibrary({ loadBooks: jest.fn().mockResolvedValue([]) });

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(screen.getByText('Find a book')).toBeTruthy();
  });

  test('renders a row per book with title and author', async () => {
    renderLibrary({
      loadBooks: jest.fn().mockResolvedValue([ULYSSES, DUBLINERS]),
    });

    await waitFor(() => expect(screen.getByText('Ulysses')).toBeTruthy());
    expect(screen.getByText('Dubliners')).toBeTruthy();
    expect(screen.getAllByText('James Joyce')).toHaveLength(2);
    expect(screen.queryByText(/book\(s\) in your library/i)).toBeNull();
  });

  test('a book with no author renders without an author line', async () => {
    renderLibrary({
      loadBooks: jest.fn().mockResolvedValue([{ ...DUBLINERS, author: null }]),
    });

    await waitFor(() => expect(screen.getByText('Dubliners')).toBeTruthy());
    expect(screen.queryByText('James Joyce')).toBeNull();
  });

  test('once non-empty, a header Add button invokes onFindBook', async () => {
    const onFindBook = jest.fn();
    renderLibrary({
      loadBooks: jest.fn().mockResolvedValue([ULYSSES]),
      onFindBook,
    });

    await waitFor(() => expect(screen.getByText('Ulysses')).toBeTruthy());

    fireEvent.press(await screen.findByLabelText('Add a book'));
    expect(onFindBook).toHaveBeenCalledTimes(1);
  });

  test('no header Add button while the library is empty', async () => {
    renderLibrary({ loadBooks: jest.fn().mockResolvedValue([]) });

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(screen.queryByLabelText('Add a book')).toBeNull();
  });

  test('Find a book button invokes onFindBook', async () => {
    const onFindBook = jest.fn();
    renderLibrary({
      loadBooks: jest.fn().mockResolvedValue([]),
      onFindBook,
    });
    await waitFor(() => screen.getByText('Find a book'));

    fireEvent.press(screen.getByText('Find a book'));

    expect(onFindBook).toHaveBeenCalledTimes(1);
  });

  test('NetworkError surfaces a toast with Retry that re-fetches', async () => {
    const loadBooks = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce([]);
    renderLibrary({ loadBooks });

    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() =>
      expect(screen.getByText('Your library is empty')).toBeTruthy(),
    );
    expect(loadBooks).toHaveBeenCalledTimes(2);
  });

  test('AuthExpired does not surface any toast (navigator handles it)', async () => {
    const loadBooks = jest.fn().mockRejectedValue(new AuthExpired());
    renderLibrary({ loadBooks });

    await waitFor(() => expect(loadBooks).toHaveBeenCalled());

    expect(screen.queryByText('Retry')).toBeNull();
    expect(screen.queryByText(/couldn't|error|expired/i)).toBeNull();
  });
});
