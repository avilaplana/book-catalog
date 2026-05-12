import { ActivityIndicator } from 'react-native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { NetworkError, ServerError } from '../../api/client';
import { type BookSearchResult } from '../../search/use-book-search';
import { ScanResultsScreen } from '../ScanResultsScreen';
import { ToastProvider } from '../../ui/toast';

const sampleResults: BookSearchResult[] = [
  {
    google_books_id: 'vol-1',
    title: 'The Hobbit',
    author: 'J. R. R. Tolkien',
    cover_url: 'https://example.com/h.jpg',
    description: 'There and back again.',
  },
  {
    google_books_id: 'vol-2',
    title: 'The Hobbit (annotated)',
    author: null,
    cover_url: null,
    description: null,
  },
];

const ISBN = '9780261103573';

function renderScanResults(opts: {
  searchBooks: (q: string) => Promise<BookSearchResult[]>;
  onSelectResult?: (r: BookSearchResult) => void;
  onScanAgain?: () => void;
}) {
  return render(
    <ToastProvider>
      <ScanResultsScreen
        isbn={ISBN}
        searchBooks={opts.searchBooks}
        onSelectResult={opts.onSelectResult ?? jest.fn()}
        onScanAgain={opts.onScanAgain ?? jest.fn()}
      />
    </ToastProvider>,
  );
}

describe('ScanResultsScreen', () => {
  test('shows a spinner while the lookup is in flight', () => {
    renderScanResults({ searchBooks: jest.fn(() => new Promise(() => {})) });

    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  test('renders the matching books and reports the tapped one', async () => {
    const searchBooks = jest.fn().mockResolvedValue(sampleResults);
    const onSelectResult = jest.fn();
    renderScanResults({ searchBooks, onSelectResult });

    await waitFor(() => expect(screen.getByText('The Hobbit')).toBeTruthy());
    expect(screen.getByText('J. R. R. Tolkien')).toBeTruthy();
    expect(screen.getByText('The Hobbit (annotated)')).toBeTruthy();
    expect(searchBooks).toHaveBeenCalledWith(`isbn:${ISBN}`);

    fireEvent.press(screen.getByText('The Hobbit'));
    expect(onSelectResult).toHaveBeenCalledWith(sampleResults[0]);
  });

  test('no match shows the empty state with a working Scan again button', async () => {
    const searchBooks = jest.fn().mockResolvedValue([]);
    const onScanAgain = jest.fn();
    renderScanResults({ searchBooks, onScanAgain });

    await waitFor(() =>
      expect(screen.getByText('No book found for this barcode.')).toBeTruthy(),
    );

    fireEvent.press(screen.getByText('Scan again'));
    expect(onScanAgain).toHaveBeenCalledTimes(1);
  });

  test('a NetworkError surfaces the retryable network toast', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new NetworkError());
    renderScanResults({ searchBooks });

    await waitFor(() =>
      expect(
        screen.getByText("Couldn't reach the server. Tap to retry."),
      ).toBeTruthy(),
    );
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  test('a ServerError surfaces the retryable server toast', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new ServerError(503));
    renderScanResults({ searchBooks });

    await waitFor(() =>
      expect(
        screen.getByText('Something went wrong. Tap to retry.'),
      ).toBeTruthy(),
    );
  });

  test('tapping Retry on the toast re-runs the lookup', async () => {
    const searchBooks = jest
      .fn()
      .mockRejectedValueOnce(new ServerError(503))
      .mockResolvedValueOnce(sampleResults);
    renderScanResults({ searchBooks });

    await waitFor(() => screen.getByText('Retry'));

    await act(async () => {
      fireEvent.press(screen.getByText('Retry'));
    });

    await waitFor(() => expect(screen.getByText('The Hobbit')).toBeTruthy());
    expect(searchBooks).toHaveBeenCalledTimes(2);
  });
});
