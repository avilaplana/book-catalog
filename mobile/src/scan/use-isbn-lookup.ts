import { useCallback, useEffect, useState } from 'react';

import { NetworkError, ServerError } from '../api/client';
import { type BookSearchResult } from '../search/use-book-search';

export type IsbnLookupStatus =
  | 'loading'
  | 'ready'
  | 'network-error'
  | 'server-error';

export type UseIsbnLookupResult = {
  status: IsbnLookupStatus;
  results: BookSearchResult[];
  retry: () => void;
};

export function useIsbnLookup(opts: {
  isbn: string;
  searchBooks: (query: string) => Promise<BookSearchResult[]>;
}): UseIsbnLookupResult {
  const { isbn, searchBooks } = opts;

  const [status, setStatus] = useState<IsbnLookupStatus>('loading');
  const [results, setResults] = useState<BookSearchResult[]>([]);

  const runLookup = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await searchBooks(`isbn:${isbn}`);
      setResults(next);
      setStatus('ready');
    } catch (e) {
      if (e instanceof ServerError) {
        setStatus('server-error');
      } else if (e instanceof NetworkError) {
        setStatus('network-error');
      } else {
        throw e;
      }
    }
  }, [isbn, searchBooks]);

  useEffect(() => {
    void runLookup();
  }, [runLookup]);

  const retry = useCallback(() => {
    void runLookup();
  }, [runLookup]);

  return { status, results, retry };
}
