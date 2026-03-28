jest.mock('@/store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/screens/auth/LoginScreen';
import { useAuthStore } from '@/store/authStore';

describe('LoginScreen', () => {
  it('renders sign-in button', () => {
    (useAuthStore as jest.Mock).mockReturnValue({ signIn: jest.fn(), isAuthenticated: false });
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('calls signIn when button is pressed', async () => {
    const mockSignIn = jest.fn().mockResolvedValue(undefined);
    (useAuthStore as jest.Mock).mockReturnValue({ signIn: mockSignIn, isAuthenticated: false });
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign in with Google'));
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
  });

  it('shows error message when signIn fails', async () => {
    const mockSignIn = jest.fn().mockRejectedValue(new Error('Sign in failed'));
    (useAuthStore as jest.Mock).mockReturnValue({ signIn: mockSignIn, isAuthenticated: false });
    const { getByText, findByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign in with Google'));
    expect(await findByText('Sign in failed. Please try again.')).toBeTruthy();
  });
});
