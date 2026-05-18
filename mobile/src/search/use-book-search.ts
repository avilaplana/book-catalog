import { useCallback, useEffect, useRef, useState } from 'react';

import { NetworkError, ServerError } from '../api/client';

export type BookSearchResult = {
  google_books_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  description: string | null;
  subtitle: string | null;
  publisher: string | null;
  published_date: string | null;
  page_count: number | null;
  categories: string | null;
  language: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
};

export type SearchStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'network-error'
  | 'server-error';

export type UseBookSearchResult = {
  query: string;
  setQuery: (q: string) => void;
  results: BookSearchResult[];
  status: SearchStatus;
  retry: () => void;
};

const DEFAULT_DEBOUNCE_MS = 300;

export function useBookSearch(opts: {
  searchBooks: (query: string) => Promise<BookSearchResult[]>;
  debounceMs?: number;
}): UseBookSearchResult {
  const { searchBooks, debounceMs = DEFAULT_DEBOUNCE_MS } = opts;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const lastQueryRef = useRef<string>('');

  const runSearch = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;
      lastQueryRef.current = trimmed;
      setStatus('loading');
      try {
        const next = await searchBooks(trimmed);
        if (lastQueryRef.current !== trimmed) return;
        setResults(next);
        setStatus('ready');
      } catch (e) {
        if (lastQueryRef.current !== trimmed) return;
        if (e instanceof ServerError) {
          setStatus('server-error');
        } else if (e instanceof NetworkError) {
          setStatus('network-error');
        } else {
          throw e;
        }
      }
    },
    [searchBooks],
  );

  useEffect(() => {
    if (!query.trim()) {
      lastQueryRef.current = '';
      setResults([]);
      setStatus('idle');
      return;
    }
    const id = setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
    return () => clearTimeout(id);
  }, [query, debounceMs, runSearch]);

  const retry = useCallback(() => {
    if (lastQueryRef.current) {
      void runSearch(lastQueryRef.current);
    }
  }, [runSearch]);

  return { query, setQuery, results, status, retry };
}
