import React from 'react';
import { render } from '@testing-library/react-native';
import BookCard from '@/components/BookCard';
import type { UserBook } from '@/types';

const mockBook: UserBook = {
  id: 'ub-1', bookId: 'b-1', googleBooksId: 'gb1', isbn: null,
  title: 'Dune', authors: ['Frank Herbert'], coverUrl: null, publisher: null,
  publishedDate: null, status: 'read', rating: 5, notes: null,
  startedAt: null, finishedAt: null, createdAt: '2026-01-01T00:00:00Z', shelves: [],
};

it('renders book title and author', () => {
  const { getByText } = render(<BookCard book={mockBook} onPress={() => {}} />);
  expect(getByText('Dune')).toBeTruthy();
  expect(getByText('Frank Herbert')).toBeTruthy();
});
