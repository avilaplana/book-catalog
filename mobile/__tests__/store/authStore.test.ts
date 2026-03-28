jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    getTokens: jest.fn(),
    signOut: jest.fn(),
  },
}));
jest.mock('@/api/auth', () => ({
  authApi: { googleAuth: jest.fn() },
}));

import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: null, isAuthenticated: false });
  });

  it('signIn stores token and sets isAuthenticated', async () => {
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({ user: { email: 'a@b.com', name: 'A', photo: null } });
    (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({ idToken: 'google-token' });
    (authApi.googleAuth as jest.Mock).mockResolvedValue({ accessToken: 'app-jwt' });
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await useAuthStore.getState().signIn();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app_jwt', 'app-jwt');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('app-jwt');
  });

  it('signOut clears token and sets isAuthenticated to false', async () => {
    useAuthStore.setState({ token: 'some-jwt', isAuthenticated: true });
    (GoogleSignin.signOut as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    await useAuthStore.getState().signOut();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('app_jwt');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('restoreSession sets isAuthenticated when token exists', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('existing-jwt');
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('restoreSession leaves isAuthenticated false when no token', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    await useAuthStore.getState().restoreSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
