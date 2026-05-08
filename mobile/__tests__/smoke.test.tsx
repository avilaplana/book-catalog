import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

test('jest + react-native testing library can render a component', () => {
  render(<Text>hello from jest</Text>);
  expect(screen.getByText('hello from jest')).toBeTruthy();
});
