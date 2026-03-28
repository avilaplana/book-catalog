import { apiClient } from './client';
import type { Profile } from '@/types';

export const profileApi = {
  async getProfile(): Promise<Profile> {
    const response = await apiClient.get<Profile>('/v1/profile');
    return response.data;
  },
};
