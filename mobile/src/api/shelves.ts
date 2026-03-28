import { apiClient } from './client';
import type { Shelf } from '@/types';

export const shelvesApi = {
  async listShelves(): Promise<Shelf[]> {
    const response = await apiClient.get<Shelf[]>('/v1/catalog/shelves');
    return response.data;
  },

  async createShelf(name: string): Promise<Shelf> {
    const response = await apiClient.post<Shelf>('/v1/catalog/shelves', { name });
    return response.data;
  },

  async deleteShelf(id: string): Promise<void> {
    await apiClient.delete(`/v1/catalog/shelves/${id}`);
  },

  async addBookToShelf(shelfId: string, userBookId: string): Promise<void> {
    await apiClient.post(`/v1/catalog/shelves/${shelfId}/books`, { user_book_id: userBookId });
  },

  async removeBookFromShelf(shelfId: string, userBookId: string): Promise<void> {
    await apiClient.delete(`/v1/catalog/shelves/${shelfId}/books/${userBookId}`);
  },
};
