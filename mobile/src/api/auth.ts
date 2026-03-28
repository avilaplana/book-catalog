import { apiClient } from './client';

export const authApi = {
  async googleAuth(idToken: string): Promise<{ accessToken: string }> {
    const response = await apiClient.post<{ access_token: string }>('/v1/auth/google', {
      id_token: idToken,
    });
    return { accessToken: response.data.access_token };
  },
};
