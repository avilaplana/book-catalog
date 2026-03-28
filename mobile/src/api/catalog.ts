import { apiClient } from './client';
import type { UserBook, AddBookPayload, UpdateBookPayload, ReadingStatus } from '@/types';

export const catalogApi = {
  async listBooks(params?: { status?: ReadingStatus; shelfId?: string }): Promise<UserBook[]> {
    const response = await apiClient.get<UserBook[]>('/v1/catalog/books', { params });
    return response.data;
  },

  async addBook(payload: AddBookPayload): Promise<UserBook> {
    const response = await apiClient.post<UserBook>('/v1/catalog/books', {
      google_books_id: payload.googleBooksId,
      status: payload.status,
      title: payload.title,
      authors: payload.authors,
      isbn: payload.isbn,
      publisher: payload.publisher,
      published_date: payload.publishedDate,
      cover_url: payload.coverUrl,
    });
    return response.data;
  },

  async getBook(id: string): Promise<UserBook> {
    const response = await apiClient.get<UserBook>(`/v1/catalog/books/${id}`);
    return response.data;
  },

  async updateBook(id: string, payload: UpdateBookPayload): Promise<UserBook> {
    const response = await apiClient.patch<UserBook>(`/v1/catalog/books/${id}`, {
      status: payload.status,
      rating: payload.rating,
      notes: payload.notes,
      started_at: payload.startedAt,
      finished_at: payload.finishedAt,
    });
    return response.data;
  },

  async deleteBook(id: string): Promise<void> {
    await apiClient.delete(`/v1/catalog/books/${id}`);
  },
};
