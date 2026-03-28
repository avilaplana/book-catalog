import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StatusTabs from '@/components/StatusTabs';

it('calls onSelect with new status when tab is pressed', () => {
  const onSelect = jest.fn();
  const { getByText } = render(<StatusTabs selected="read" onSelect={onSelect} />);
  fireEvent.press(getByText('Want to Read'));
  expect(onSelect).toHaveBeenCalledWith('want_to_read');
});
