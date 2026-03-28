import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StarRating from '@/components/StarRating';

it('calls onChange with correct star value', () => {
  const onChange = jest.fn();
  const { getByTestId } = render(<StarRating value={3} onChange={onChange} />);
  fireEvent.press(getByTestId('star-5'));
  expect(onChange).toHaveBeenCalledWith(5);
});

it('renders correct number of filled stars', () => {
  const { getByTestId } = render(<StarRating value={3} onChange={() => {}} />);
  expect(getByTestId('star-3').props.children).toBe('★');
  expect(getByTestId('star-4').props.children).toBe('☆');
});
