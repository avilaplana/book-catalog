import { act, renderHook, waitFor } from '@testing-library/react-native';

import { NetworkError, ServerError } from '../../api/client';
import { type BookSearchResult } from '../../search/use-book-search';
import { aBookSearchResult } from '../../search/test-fixtures';
import { useIsbnLookup } from '../use-isbn-lookup';

const sampleResult: BookSearchResult = aBookSearchResult({
  google_books_id: 'vol-1',
  title: 'The Hobbit',
  author: 'J. R. R. Tolkien',
  cover_url: 'https://example.com/h.jpg',
  description: 'There and back again.',
});

function renderLookup(
  isbn: string,
  searchBooks: (q: string) => Promise<BookSearchResult[]>,
) {
  return renderHook(() => useIsbnLookup({ isbn, searchBooks }));
}

describe('useIsbnLookup', () => {
  test('looks the ISBN up once and exposes the results', async () => {
    const searchBooks = jest.fn().mockResolvedValue([sampleResult]);
    const { result } = renderLookup('9780261103573', searchBooks);

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results).toEqual([sampleResult]);
    expect(searchBooks).toHaveBeenCalledTimes(1);
    expect(searchBooks).toHaveBeenCalledWith('isbn:9780261103573');
  });

  test('an empty result set is a ready state with no results', async () => {
    const searchBooks = jest.fn().mockResolvedValue([]);
    const { result } = renderLookup('9780000000002', searchBooks);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results).toEqual([]);
  });

  test('a ServerError surfaces as server-error', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new ServerError(503));
    const { result } = renderLookup('9780261103573', searchBooks);

    await waitFor(() => expect(result.current.status).toBe('server-error'));
  });

  test('a NetworkError surfaces as network-error', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new NetworkError());
    const { result } = renderLookup('9780261103573', searchBooks);

    await waitFor(() => expect(result.current.status).toBe('network-error'));
  });

  test('retry re-runs the lookup', async () => {
    const searchBooks = jest
      .fn()
      .mockRejectedValueOnce(new ServerError(503))
      .mockResolvedValueOnce([sampleResult]);
    const { result } = renderLookup('9780261103573', searchBooks);

    await waitFor(() => expect(result.current.status).toBe('server-error'));

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results).toEqual([sampleResult]);
    expect(searchBooks).toHaveBeenCalledTimes(2);
    expect(searchBooks).toHaveBeenNthCalledWith(2, 'isbn:9780261103573');
  });
});
