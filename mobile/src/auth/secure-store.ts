import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { SessionStorage } from './session';

const webStorage: SessionStorage = {
  async getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    globalThis.localStorage?.setItem(key, value);
  },
  async removeItem(key) {
    globalThis.localStorage?.removeItem(key);
  },
};

const nativeStorage: SessionStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const secureStoreAdapter: SessionStorage =
  Platform.OS === 'web' ? webStorage : nativeStorage;
