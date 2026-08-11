import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

// Shared storage adapter for every persisted store (async — see useHydrated).
export const storage = createJSONStorage(() => AsyncStorage);

// Bump to invalidate saved state when a store's shape changes.
export const STORE_VERSION = 1;
