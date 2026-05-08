import { render, screen } from '@testing-library/react-native';

import { PreviewScreen } from '../PreviewScreen';
import { type BookSearchResult } from '../../search/use-book-search';

const fullResult: BookSearchResult = {
  google_books_id: 'vol-1',
  title: 'Ulysses',
  author: 'James Joyce',
  cover_url: 'https://example.com/u.jpg',
  description: 'A modernist novel about Leopold Bloom.',
};

describe('PreviewScreen', () => {
  test('renders title, author, and description', () => {
    render(<PreviewScreen result={fullResult} />);

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.getByText('James Joyce')).toBeTruthy();
    expect(
      screen.getByText('A modernist novel about Leopold Bloom.'),
    ).toBeTruthy();
  });

  test('does not render an Add button (slice 1.3)', () => {
    render(<PreviewScreen result={fullResult} />);

    expect(screen.queryByText(/^Add/)).toBeNull();
  });

  test('omits author and description when missing', () => {
    render(
      <PreviewScreen
        result={{
          ...fullResult,
          author: null,
          description: null,
        }}
      />,
    );

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.queryByText('James Joyce')).toBeNull();
    expect(screen.queryByText(/A modernist novel/)).toBeNull();
  });
});
