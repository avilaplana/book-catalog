import { apiClient } from './client';
import type { BookSearchResult } from '@/types';

export const booksApi = {
  async search(q: string): Promise<BookSearchResult[]> {
    const response = await apiClient.get<BookSearchResult[]>('/v1/books/search', { params: { q } });
    return response.data;
  },

  async lookupIsbn(isbn: string): Promise<BookSearchResult | null> {
    try {
      const response = await apiClient.get<BookSearchResult>(`/v1/books/isbn/${isbn}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },
};
