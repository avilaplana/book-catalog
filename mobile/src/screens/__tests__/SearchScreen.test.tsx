import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { NetworkError, ServerError } from '../../api/client';
import {
  type BookSearchResult,
} from '../../search/use-book-search';
import { SearchScreen } from '../SearchScreen';
import { ToastProvider } from '../../ui/toast';

const sampleResults: BookSearchResult[] = [
  {
    google_books_id: 'vol-1',
    title: 'Ulysses',
    author: 'James Joyce',
    cover_url: 'https://example.com/u.jpg',
    description: 'A modernist novel.',
  },
  {
    google_books_id: 'vol-2',
    title: 'The Odyssey',
    author: 'Homer',
    cover_url: null,
    description: null,
  },
];

function renderSearch(opts: {
  searchBooks: (q: string) => Promise<BookSearchResult[]>;
  onSelectResult?: (result: BookSearchResult) => void;
}) {
  return render(
    <ToastProvider>
      <SearchScreen
        searchBooks={opts.searchBooks}
        onSelectResult={opts.onSelectResult ?? jest.fn()}
      />
    </ToastProvider>,
  );
}

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders the search input', () => {
    renderSearch({ searchBooks: jest.fn() });

    expect(screen.getByPlaceholderText(/title or author/i)).toBeTruthy();
  });

  test('typing into the input runs a debounced search and renders results', async () => {
    const searchBooks = jest.fn().mockResolvedValue(sampleResults);
    renderSearch({ searchBooks });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'ulysses',
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(screen.getByText('Ulysses')).toBeTruthy());
    expect(screen.getByText('James Joyce')).toBeTruthy();
    expect(screen.getByText('The Odyssey')).toBeTruthy();
    expect(screen.getByText('Homer')).toBeTruthy();
  });

  test('empty result set renders the inline empty state', async () => {
    const searchBooks = jest.fn().mockResolvedValue([]);
    renderSearch({ searchBooks });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'no-such-book',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(
        screen.getByText(/No books found/i),
      ).toBeTruthy(),
    );
  });

  test('tapping a result calls onSelectResult with that result', async () => {
    const searchBooks = jest.fn().mockResolvedValue(sampleResults);
    const onSelectResult = jest.fn();
    renderSearch({ searchBooks, onSelectResult });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'ulysses',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => screen.getByText('Ulysses'));

    fireEvent.press(screen.getByText('Ulysses'));

    expect(onSelectResult).toHaveBeenCalledWith(sampleResults[0]);
  });

  test('NetworkError surfaces a retryable toast with the network copy', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new NetworkError());
    renderSearch({ searchBooks });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'q',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't reach the server. Tap to retry."),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  test('ServerError surfaces a retryable toast with the server copy', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new ServerError(503));
    renderSearch({ searchBooks });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'q',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(
        screen.getByText('Something went wrong. Tap to retry.'),
      ).toBeTruthy(),
    );
  });

  test('tapping Retry on the toast re-runs the last query', async () => {
    const searchBooks = jest
      .fn()
      .mockRejectedValueOnce(new ServerError(503))
      .mockResolvedValueOnce(sampleResults);
    renderSearch({ searchBooks });

    fireEvent.changeText(
      screen.getByPlaceholderText(/title or author/i),
      'ulysses',
    );
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => screen.getByText('Retry'));

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    await waitFor(() => expect(screen.getByText('Ulysses')).toBeTruthy());
    expect(searchBooks).toHaveBeenCalledTimes(2);
    expect(searchBooks).toHaveBeenNthCalledWith(2, 'ulysses');
  });
});
