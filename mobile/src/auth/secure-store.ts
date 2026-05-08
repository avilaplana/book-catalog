import * as SecureStore from 'expo-secure-store';

import type { SessionStorage } from './session';

export const secureStoreAdapter: SessionStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};
