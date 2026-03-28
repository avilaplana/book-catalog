jest.mock('@/api/books', () => ({
  booksApi: { search: jest.fn(), lookupIsbn: jest.fn() },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@/components/ISBNScanner', () => {
  const React = require('react');
  const { View } = require('react-native');
  return () => React.createElement(View, { testID: 'isbn-scanner' });
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { booksApi } from '@/api/books';
import DiscoverScreen from '@/screens/discover/DiscoverScreen';

const mockResult = {
  googleBooksId: 'gb1', isbn: '9780441013593', title: 'Dune',
  authors: ['Frank Herbert'], description: null, coverUrl: null,
  pageCount: 412, publishedDate: '1965', publisher: 'Chilton Books',
};

it('shows search results when user types a query', async () => {
  (booksApi.search as jest.Mock).mockResolvedValue([mockResult]);
  const { getByPlaceholderText, findByText } = render(<DiscoverScreen />);
  fireEvent.changeText(getByPlaceholderText('Search title or author...'), 'Dune');
  expect(await findByText('Dune')).toBeTruthy();
});

it('renders search input and scan button', () => {
  (booksApi.search as jest.Mock).mockResolvedValue([]);
  const { getByPlaceholderText } = render(<DiscoverScreen />);
  expect(getByPlaceholderText('Search title or author...')).toBeTruthy();
});
