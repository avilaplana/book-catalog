jest.mock('@/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { catalogApi } from '@/api/catalog';
import { apiClient } from '@/api/client';
import type { UserBook } from '@/types';

const mockUserBook: UserBook = {
  id: 'ub-1', bookId: 'b-1', googleBooksId: 'gb1', isbn: null,
  title: 'Dune', authors: ['Frank Herbert'], coverUrl: null, publisher: null,
  publishedDate: null, status: 'read', rating: 5, notes: null,
  startedAt: null, finishedAt: null, createdAt: '2026-01-01T00:00:00Z', shelves: [],
};

describe('catalogApi', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listBooks returns array', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [mockUserBook] });
    const result = await catalogApi.listBooks();
    expect(result).toEqual([mockUserBook]);
    expect(apiClient.get).toHaveBeenCalledWith('/v1/catalog/books', { params: undefined });
  });

  it('listBooks passes status filter', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
    await catalogApi.listBooks({ status: 'read' });
    expect(apiClient.get).toHaveBeenCalledWith('/v1/catalog/books', { params: { status: 'read' } });
  });

  it('addBook sends correct payload', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({ data: mockUserBook });
    await catalogApi.addBook({ googleBooksId: 'gb1', status: 'read' });
    expect(apiClient.post).toHaveBeenCalledWith('/v1/catalog/books', expect.objectContaining({
      google_books_id: 'gb1',
      status: 'read',
    }));
  });

  it('updateBook sends correct payload', async () => {
    (apiClient.patch as jest.Mock).mockResolvedValue({ data: { ...mockUserBook, rating: 4 } });
    const result = await catalogApi.updateBook('ub-1', { rating: 4 });
    expect(apiClient.patch).toHaveBeenCalledWith('/v1/catalog/books/ub-1', expect.objectContaining({ rating: 4 }));
    expect(result.rating).toBe(4);
  });

  it('deleteBook calls correct endpoint', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({});
    await catalogApi.deleteBook('ub-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/catalog/books/ub-1');
  });
});
