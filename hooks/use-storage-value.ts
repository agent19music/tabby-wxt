/// <reference types="react" />

import { useEffect, useState } from 'react';
import type { StorageSchema } from '@/types';
import { getDefaultStorageValue, watchStorageKey } from '@/utils/storage';

declare const chrome: {
  storage: {
    local: {
      get(keys: null | string | string[]): Promise<Record<string, unknown>>;
    };
  };
};

export function useStorageValue<K extends keyof StorageSchema>(key: K) {
  const [value, setValue] = useState<StorageSchema[K]>(() => getDefaultStorageValue(key));

  useEffect(() => {
    let isMounted = true;

    async function readInitial() {
      try {
        const result = await chrome.storage.local.get(key as string);
        const nextValue = (result[key as string] ?? getDefaultStorageValue(key)) as StorageSchema[K];
        if (isMounted) {
          setValue(nextValue);
        }
      } catch (error) {
        console.error(`[useStorageValue] Failed to read storage key: ${String(key)}`, error);
      }
    }

    readInitial();

    const unsubscribe = watchStorageKey(key, (next) => {
      if (isMounted) {
        setValue(next);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [key]);

  return value;
}
