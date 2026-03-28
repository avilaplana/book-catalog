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

it('shows ISBN not found message on 404 scan result', async () => {
  (booksApi.lookupIsbn as jest.Mock).mockResolvedValue(null);
  (booksApi.search as jest.Mock).mockResolvedValue([]);
  const { findByText, getByTestId } = render(<DiscoverScreen />);
  const screen = getByTestId('discover-screen');
  screen.props.onScanResult?.('0000000000000');
  expect(await findByText('Book not found by ISBN — search by title/author')).toBeTruthy();
});
