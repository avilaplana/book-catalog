import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authApi } from '@/api/auth';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,

  signIn: async () => {
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signIn();
    const { idToken } = await GoogleSignin.getTokens();
    const { accessToken } = await authApi.googleAuth(idToken!);
    await SecureStore.setItemAsync('app_jwt', accessToken);
    set({ token: accessToken, isAuthenticated: true });
  },

  signOut: async () => {
    await GoogleSignin.signOut();
    await SecureStore.deleteItemAsync('app_jwt');
    set({ token: null, isAuthenticated: false });
  },

  restoreSession: async () => {
    const token = await SecureStore.getItemAsync('app_jwt');
    if (token) set({ token, isAuthenticated: true });
  },
}));
