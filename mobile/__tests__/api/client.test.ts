import MockAdapter from 'axios-mock-adapter';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { getTokens: jest.fn() },
}));
jest.mock('@/api/auth', () => ({
  authApi: { googleAuth: jest.fn() },
}));

import { apiClient } from '@/api/client';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { authApi } from '@/api/auth';

describe('apiClient interceptors', () => {
  it('attaches Authorization header from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-jwt');
    const mock = new MockAdapter(apiClient);
    mock.onGet('/v1/profile').reply(200, { id: '1' });
    const response = await apiClient.get('/v1/profile');
    expect(response.config.headers.Authorization).toBe('Bearer stored-jwt');
    mock.restore();
  });

  it('refreshes token on 401 and retries original request', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('expired-jwt');
    (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({ idToken: 'google-id-token' });
    (authApi.googleAuth as jest.Mock).mockResolvedValue({ accessToken: 'new-jwt' });
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const mock = new MockAdapter(apiClient);
    mock.onGet('/v1/catalog/books').replyOnce(401).onGet('/v1/catalog/books').reply(200, []);

    const response = await apiClient.get('/v1/catalog/books');
    expect(response.status).toBe(200);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('app_jwt', 'new-jwt');
    mock.restore();
  });
});
