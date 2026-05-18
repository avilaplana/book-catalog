import { Image } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { BookDetails } from '../BookDetails';

describe('BookDetails', () => {
  test('renders the title', () => {
    render(<BookDetails title="The Lord of the Rings" />);

    expect(screen.getByText('The Lord of the Rings')).toBeTruthy();
  });

  test('renders subtitle when present', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        subtitle="One Volume Edition"
      />,
    );

    expect(screen.getByText('One Volume Edition')).toBeTruthy();
  });

  test('omits subtitle when absent', () => {
    render(<BookDetails title="The Lord of the Rings" subtitle={null} />);

    expect(screen.queryByText('One Volume Edition')).toBeNull();
  });

  test('renders author when present', () => {
    render(
      <BookDetails title="The Lord of the Rings" author="J.R.R. Tolkien" />,
    );

    expect(screen.getByText('J.R.R. Tolkien')).toBeTruthy();
  });

  test('omits author when absent', () => {
    render(<BookDetails title="The Lord of the Rings" author={null} />);

    expect(screen.queryByText('J.R.R. Tolkien')).toBeNull();
  });

  test('renders the cover image when a coverUrl is given', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        coverUrl="https://example.com/lotr.jpg"
      />,
    );

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: 'https://example.com/lotr.jpg' });
  });

  test('renders a placeholder when coverUrl is null', () => {
    render(<BookDetails title="The Lord of the Rings" coverUrl={null} />);

    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  test('renders the ISBN-13 line when isbn13 is present', () => {
    render(
      <BookDetails title="The Lord of the Rings" isbn13="9780261103573" />,
    );

    expect(screen.getByText('ISBN: 9780261103573')).toBeTruthy();
  });

  test('omits the ISBN line when isbn13 is absent', () => {
    render(<BookDetails title="The Lord of the Rings" isbn13={null} />);

    expect(screen.queryByText(/^ISBN:/)).toBeNull();
  });

  test('renders categories when present', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        categories="Fiction, Fantasy"
      />,
    );

    expect(screen.getByText('Fiction, Fantasy')).toBeTruthy();
  });

  test('omits categories when absent', () => {
    render(<BookDetails title="The Lord of the Rings" categories={null} />);

    expect(screen.queryByText('Fiction, Fantasy')).toBeNull();
  });

  test('renders metadata line joining publisher, publishedDate, pageCount, language', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        publisher="HarperCollins"
        publishedDate="2005-10-25"
        pageCount={1216}
        language="en"
      />,
    );

    expect(
      screen.getByText('HarperCollins · 2005-10-25 · 1216 pages · en'),
    ).toBeTruthy();
  });

  test('skips null parts of the metadata line', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        publisher="HarperCollins"
        publishedDate={null}
        pageCount={1216}
        language={null}
      />,
    );

    expect(screen.getByText('HarperCollins · 1216 pages')).toBeTruthy();
  });

  test('omits the metadata line entirely when all four fields are absent', () => {
    render(
      <BookDetails
        title="The Lord of the Rings"
        publisher={null}
        publishedDate={null}
        pageCount={null}
        language={null}
      />,
    );

    // No dot separator should appear anywhere
    expect(screen.queryByText(/·/)).toBeNull();
    expect(screen.queryByText(/pages/)).toBeNull();
  });
});
