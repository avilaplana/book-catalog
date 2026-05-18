import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { PreviewScreen } from '../PreviewScreen';
import { AuthExpired, Conflict, ServerError } from '../../api/client';
import { ToastProvider } from '../../ui/toast';
import { type BookSearchResult } from '../../search/use-book-search';

const fullResult: BookSearchResult = {
  google_books_id: 'vol-1',
  title: 'Ulysses',
  author: 'James Joyce',
  cover_url: 'https://example.com/u.jpg',
  description: 'A modernist novel about Leopold Bloom.',
  subtitle: null,
  publisher: null,
  published_date: null,
  page_count: null,
  categories: null,
  language: null,
  isbn_13: null,
  isbn_10: null,
};

const lordOfTheRings: BookSearchResult = {
  google_books_id: 'vol-lotr',
  title: 'The Lord of the Rings',
  author: 'J.R.R. Tolkien',
  cover_url: 'https://example.com/lotr.jpg',
  description: 'An epic high-fantasy novel.',
  subtitle: 'One Volume Edition',
  publisher: 'HarperCollins',
  published_date: '2005-10-25',
  page_count: 1216,
  categories: 'Fiction, Fantasy',
  language: 'en',
  isbn_13: '9780261103573',
  isbn_10: '0261103571',
};

function renderPreview(opts: {
  addBook?: () => Promise<void>;
  onAdded?: () => void;
  result?: BookSearchResult;
} = {}) {
  const addBook = opts.addBook ?? jest.fn().mockResolvedValue(undefined);
  const onAdded = opts.onAdded ?? jest.fn();
  const utils = render(
    <ToastProvider>
      <PreviewScreen
        result={opts.result ?? fullResult}
        addBook={addBook}
        onAdded={onAdded}
      />
    </ToastProvider>,
  );
  return { addBook, onAdded, ...utils };
}

describe('PreviewScreen', () => {
  test('renders title, author, and description', () => {
    renderPreview();

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.getByText('James Joyce')).toBeTruthy();
    expect(
      screen.getByText('A modernist novel about Leopold Bloom.'),
    ).toBeTruthy();
  });

  test('omits author and description when missing', () => {
    renderPreview({ result: { ...fullResult, author: null, description: null } });

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.queryByText('James Joyce')).toBeNull();
    expect(screen.queryByText(/A modernist novel/)).toBeNull();
  });

  test('renders rich fields (subtitle, metadata line, categories, ISBN-13)', () => {
    renderPreview({ result: lordOfTheRings });

    expect(screen.getByText('The Lord of the Rings')).toBeTruthy();
    expect(screen.getByText('One Volume Edition')).toBeTruthy();
    expect(
      screen.getByText('HarperCollins · 2005-10-25 · 1216 pages · en'),
    ).toBeTruthy();
    expect(screen.getByText('Fiction, Fantasy')).toBeTruthy();
    expect(screen.getByText('ISBN: 9780261103573')).toBeTruthy();
    expect(screen.getByText('An epic high-fantasy novel.')).toBeTruthy();
  });

  test('Add: on success calls onAdded and shows a success toast', async () => {
    const { addBook, onAdded } = renderPreview();

    fireEvent.press(screen.getByText('Add to library'));

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(addBook).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Added to your library.')).toBeTruthy();
  });

  test('Add: on Conflict stays on Preview and shows a duplicate toast', async () => {
    const { onAdded } = renderPreview({
      addBook: jest.fn().mockRejectedValue(new Conflict()),
    });

    fireEvent.press(screen.getByText('Add to library'));

    await waitFor(() =>
      expect(screen.getByText('Already in your library.')).toBeTruthy(),
    );
    expect(onAdded).not.toHaveBeenCalled();
  });

  test('Add: on a server fault shows a tap-to-retry toast that retries', async () => {
    const addBook = jest
      .fn()
      .mockRejectedValueOnce(new ServerError(503))
      .mockResolvedValueOnce(undefined);
    const onAdded = jest.fn();
    renderPreview({ addBook, onAdded });

    fireEvent.press(screen.getByText('Add to library'));

    await waitFor(() => expect(screen.getByText('Retry')).toBeTruthy());
    expect(onAdded).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => expect(onAdded).toHaveBeenCalledTimes(1));
    expect(addBook).toHaveBeenCalledTimes(2);
  });

  test('Add: AuthExpired is swallowed (navigator handles it)', async () => {
    const { addBook, onAdded } = renderPreview({
      addBook: jest.fn().mockRejectedValue(new AuthExpired()),
    });

    fireEvent.press(screen.getByText('Add to library'));

    await waitFor(() => expect(addBook).toHaveBeenCalledTimes(1));
    expect(onAdded).not.toHaveBeenCalled();
    expect(screen.queryByText('Retry')).toBeNull();
    expect(screen.queryByText('Already in your library.')).toBeNull();
  });
});
