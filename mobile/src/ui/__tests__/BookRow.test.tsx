import { Image } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { BookRow } from '../BookRow';

describe('BookRow', () => {
  test('renders the title and author', () => {
    render(<BookRow title="Ulysses" author="James Joyce" />);

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.getByText('James Joyce')).toBeTruthy();
  });

  test('omits the author when it is absent', () => {
    render(<BookRow title="Ulysses" author={null} />);

    expect(screen.getByText('Ulysses')).toBeTruthy();
    expect(screen.queryByText('James Joyce')).toBeNull();
  });

  test('shows the cover image when a coverUrl is given', () => {
    render(<BookRow title="Ulysses" coverUrl="https://example.com/u.jpg" />);

    const image = screen.UNSAFE_getByType(Image);
    expect(image.props.source).toEqual({ uri: 'https://example.com/u.jpg' });
  });

  test('renders a placeholder instead of an image when there is no coverUrl', () => {
    render(<BookRow title="Ulysses" coverUrl={null} />);

    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
  });

  test('calls onPress when the row is pressed', () => {
    const onPress = jest.fn();
    render(<BookRow title="Ulysses" onPress={onPress} />);

    fireEvent.press(screen.getByText('Ulysses'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
