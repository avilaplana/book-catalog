jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));
jest.mock('@/api/catalog', () => ({
  catalogApi: { getBook: jest.fn(), updateBook: jest.fn() },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import BookDetailScreen from '@/screens/library/BookDetailScreen';

const mockUserBook = {
  id: 'ub-1', bookId: 'b-1', title: 'Dune', authors: ['Frank Herbert'],
  status: 'read', coverUrl: null, googleBooksId: 'gb1', isbn: null,
  publisher: 'Chilton Books', publishedDate: '1965', rating: 4, notes: 'Great book',
  startedAt: null, finishedAt: null, createdAt: '2026-01-01', shelves: [{ id: 's-1', name: 'Sci-Fi' }],
};

it('renders book title, author, notes and shelf', () => {
  (useQuery as jest.Mock).mockReturnValue({ data: mockUserBook, isLoading: false });
  (useMutation as jest.Mock).mockReturnValue({ mutate: jest.fn(), isPending: false });
  const route = { params: { userBookId: 'ub-1' } } as any;
  const { getByText } = render(<BookDetailScreen route={route} />);
  expect(getByText('Dune')).toBeTruthy();
  expect(getByText('Frank Herbert')).toBeTruthy();
  expect(getByText('Great book')).toBeTruthy();
  expect(getByText('Sci-Fi')).toBeTruthy();
});
