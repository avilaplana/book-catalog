import { act, renderHook, waitFor } from '@testing-library/react-native';

import { NetworkError, ServerError } from '../../api/client';
import {
  useBookSearch,
  type BookSearchResult,
} from '../use-book-search';
import { aBookSearchResult } from '../test-fixtures';

const sampleResult: BookSearchResult = aBookSearchResult({
  google_books_id: 'vol-1',
  title: 'The Title',
  author: 'Alice',
  cover_url: 'https://example.com/c.jpg',
  description: 'A description.',
});

function renderSearch(searchBooks: (q: string) => Promise<BookSearchResult[]>) {
  return renderHook(() => useBookSearch({ searchBooks }));
}

describe('useBookSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('initial state is idle, empty results, empty query', () => {
    const { result } = renderSearch(jest.fn());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.status).toBe('idle');
  });

  test('setQuery debounces ~300ms before calling searchBooks', async () => {
    const searchBooks = jest.fn().mockResolvedValue([sampleResult]);
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('alice');
    });

    expect(searchBooks).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(searchBooks).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(searchBooks).toHaveBeenCalledWith('alice');

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results).toEqual([sampleResult]);
  });

  test('rapid setQuery only runs the most recent query once', async () => {
    const searchBooks = jest.fn().mockResolvedValue([sampleResult]);
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('a');
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setQuery('al');
    });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    act(() => {
      result.current.setQuery('alice');
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(searchBooks).toHaveBeenCalledTimes(1);
    expect(searchBooks).toHaveBeenCalledWith('alice');
  });

  test('clearing the query immediately resets results and status without fetching', async () => {
    const searchBooks = jest.fn().mockResolvedValue([sampleResult]);
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('alice');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      result.current.setQuery('');
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.status).toBe('idle');
    expect(searchBooks).toHaveBeenCalledTimes(1);
  });

  test('blank/whitespace query is treated as empty', async () => {
    const searchBooks = jest.fn().mockResolvedValue([sampleResult]);
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('   ');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.status).toBe('idle');
    expect(searchBooks).not.toHaveBeenCalled();
  });

  test('NetworkError sets status to network-error without clearing results', async () => {
    const searchBooks = jest
      .fn()
      .mockResolvedValueOnce([sampleResult])
      .mockRejectedValueOnce(new NetworkError());
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('alice');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    act(() => {
      result.current.setQuery('alice2');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.status).toBe('network-error'));

    expect(result.current.results).toEqual([sampleResult]);
  });

  test('ServerError sets status to server-error', async () => {
    const searchBooks = jest.fn().mockRejectedValue(new ServerError(503));
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('alice');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.status).toBe('server-error'));
  });

  test('retry re-runs the last query', async () => {
    const searchBooks = jest
      .fn()
      .mockRejectedValueOnce(new ServerError(503))
      .mockResolvedValueOnce([sampleResult]);
    const { result } = renderSearch(searchBooks);

    act(() => {
      result.current.setQuery('alice');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => expect(result.current.status).toBe('server-error'));

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.results).toEqual([sampleResult]);
    expect(searchBooks).toHaveBeenCalledTimes(2);
    expect(searchBooks).toHaveBeenNthCalledWith(2, 'alice');
  });
});
