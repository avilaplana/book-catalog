jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));
jest.mock('@/api/catalog', () => ({
  catalogApi: { listBooks: jest.fn() },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import LibraryScreen from '@/screens/library/LibraryScreen';

const mockBooks = [
  { id: 'ub-1', bookId: 'b-1', title: 'Dune', authors: ['Frank Herbert'],
    status: 'read', coverUrl: null, googleBooksId: 'gb1', isbn: null,
    publisher: null, publishedDate: null, rating: null, notes: null,
    startedAt: null, finishedAt: null, createdAt: '2026-01-01', shelves: [] },
];

describe('LibraryScreen', () => {
  it('renders books from query', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: mockBooks, isLoading: false });
    const { getByText } = render(<LibraryScreen />);
    expect(getByText('Dune')).toBeTruthy();
  });

  it('shows loading indicator while fetching', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: true });
    const { getByTestId } = render(<LibraryScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
});
