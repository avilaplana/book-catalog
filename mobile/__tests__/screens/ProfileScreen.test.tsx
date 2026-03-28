jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));
jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));
jest.mock('@/api/profile', () => ({
  profileApi: { getProfile: jest.fn() },
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import ProfileScreen from '@/screens/profile/ProfileScreen';

const mockProfile = {
  id: 'u-1', email: 'test@example.com', displayName: 'Test User', avatarUrl: null,
  createdAt: '2026-01-01', totalBooks: 12,
  statusCounts: { wantToRead: 3, currentlyReading: 2, read: 7 },
  shelfCount: 4,
};

it('renders profile stats', () => {
  (useQuery as jest.Mock).mockReturnValue({ data: mockProfile, isLoading: false });
  (useAuthStore as jest.Mock).mockReturnValue({ signOut: jest.fn() });
  const { getByText } = render(<ProfileScreen />);
  expect(getByText('12')).toBeTruthy();
  expect(getByText('Test User')).toBeTruthy();
});

it('calls signOut when sign out button is pressed', async () => {
  const mockSignOut = jest.fn().mockResolvedValue(undefined);
  (useQuery as jest.Mock).mockReturnValue({ data: mockProfile, isLoading: false });
  (useAuthStore as jest.Mock).mockReturnValue({ signOut: mockSignOut });
  const { getByText } = render(<ProfileScreen />);
  fireEvent.press(getByText('Sign Out'));
  await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
});
