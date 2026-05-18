import type { BookSearchResult } from './use-book-search';

export function aBookSearchResult(
  overrides: Pick<BookSearchResult, 'google_books_id' | 'title'> &
    Partial<BookSearchResult>,
): BookSearchResult {
  return {
    author: null,
    cover_url: null,
    description: null,
    subtitle: null,
    publisher: null,
    published_date: null,
    page_count: null,
    categories: null,
    language: null,
    isbn_13: null,
    isbn_10: null,
    ...overrides,
  };
}
