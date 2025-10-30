import type { CartItem, StorageSchema } from '@/types';

type StorageChange = { oldValue?: unknown; newValue?: unknown };

declare const chrome: {
  storage: {
    local: {
      get(keys: null | string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      clear(): Promise<void>;
    };
    onChanged: {
      addListener(
        listener: (
          changes: Record<string, StorageChange>,
          areaName: string
        ) => void
      ): void;
      removeListener(listener: (...args: unknown[]) => void): void;
    };
  };
};

const STORAGE_DEFAULTS: StorageSchema = {
  siteCategories: {},
  activityLog: [],
  indexedProducts: [],
  cartItems: [],
  currentProduct: null,
  productComparisons: [],
  priceAlerts: [],
};

function cloneDefaultValue<K extends keyof StorageSchema>(
  key: K
): StorageSchema[K] {
  const value = STORAGE_DEFAULTS[key];

  if (Array.isArray(value)) {
    return [...value] as StorageSchema[K];
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, unknown>) } as StorageSchema[K];
  }

  return value;
}

export function getDefaultStorageValue<K extends keyof StorageSchema>(
  key: K
): StorageSchema[K] {
  return cloneDefaultValue(key);
}

export function getStorageDefaults(): StorageSchema {
  return {
    siteCategories: cloneDefaultValue('siteCategories'),
    activityLog: cloneDefaultValue('activityLog'),
    indexedProducts: cloneDefaultValue('indexedProducts'),
    cartItems: cloneDefaultValue('cartItems'),
    currentProduct: cloneDefaultValue('currentProduct'),
    productComparisons: cloneDefaultValue('productComparisons'),
    priceAlerts: cloneDefaultValue('priceAlerts'),
  };
}

export async function getActivityLog() {
  const result = await chrome.storage.local.get('activityLog');
  return (result.activityLog || []) as StorageSchema['activityLog'];
}

export async function getIndexedProducts() {
  const result = await chrome.storage.local.get('indexedProducts');
  return (result.indexedProducts || []) as StorageSchema['indexedProducts'];
}

export async function getSiteCategories() {
  const result = await chrome.storage.local.get('siteCategories');
  return (result.siteCategories || {}) as StorageSchema['siteCategories'];
}

export async function getCurrentProduct() {
  const result = await chrome.storage.local.get('currentProduct');
  return result.currentProduct as StorageSchema['currentProduct'];
}

export async function getCartItems() {
  const result = await chrome.storage.local.get('cartItems');
  return (result.cartItems || []) as StorageSchema['cartItems'];
}

export async function exportAllData() {
  const data = await chrome.storage.local.get(null);
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `tabby-export-${Date.now()}.json`;
  a.click();
  
  console.log('[Storage] ✅ Data exported');
}

export async function importData(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  await chrome.storage.local.set(data);
  console.log('[Storage] ✅ Data imported');
}

export async function addToCart(
  productId: string,
  listingUrl: string,
  options: { notes?: string; priority?: CartItem['priority'] } = {}
) {
  const cartItems = await getCartItems();
  
  const existing = cartItems.find(item => 
    item.productId === productId && item.selectedListingUrl === listingUrl
  );

  if (existing) {
    existing.quantity += 1;
    if (options.notes) existing.notes = options.notes;
    if (options.priority) existing.priority = options.priority;
  } else {
    cartItems.push({
      productId,
      selectedListingUrl: listingUrl,
      quantity: 1,
      addedAt: Date.now(),
      notes: options.notes,
      priority: options.priority
    });
  }

  await chrome.storage.local.set({ cartItems });
  console.log('[Storage] ✅ Added to cart:', productId);
}

export async function removeFromCart(productId: string, listingUrl: string) {
  let cartItems = await getCartItems();
  cartItems = cartItems.filter(item => 
    !(item.productId === productId && item.selectedListingUrl === listingUrl)
  );
  await chrome.storage.local.set({ cartItems });
  console.log('[Storage] ✅ Removed from cart:', productId);
}

export async function updateCartItemQuantity(
  productId: string,
  listingUrl: string,
  quantity: number
) {
  const cartItems = await getCartItems();
  const target = cartItems.find(item => 
    item.productId === productId && item.selectedListingUrl === listingUrl
  );

  if (!target) return;

  if (quantity <= 0) {
    await removeFromCart(productId, listingUrl);
    return;
  }

  target.quantity = quantity;
  await chrome.storage.local.set({ cartItems });
  console.log('[Storage] ✅ Updated cart item quantity:', productId, quantity);
}

export async function updateCartItemMeta(
  productId: string,
  listingUrl: string,
  updates: { notes?: string; priority?: CartItem['priority'] }
) {
  const cartItems = await getCartItems();
  const target = cartItems.find(item => 
    item.productId === productId && item.selectedListingUrl === listingUrl
  );

  if (!target) return;

  if (typeof updates.notes === 'string') {
    target.notes = updates.notes;
  }

  if (updates.priority) {
    target.priority = updates.priority;
  }

  await chrome.storage.local.set({ cartItems });
  console.log('[Storage] ✅ Updated cart item meta:', productId);
}

export function watchStorageKey<K extends keyof StorageSchema>(
  key: K,
  callback: (value: StorageSchema[K]) => void
) {
  const listener = (
    changes: Record<string, StorageChange>,
    areaName: string
  ) => {
    if (areaName !== 'local') return;
    if (!changes[key as string]) return;
    const next = changes[key as string].newValue;
    const value = (next !== undefined
      ? next
      : getDefaultStorageValue(key)) as StorageSchema[K];
    callback(value);
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function clearStorage() {
  await chrome.storage.local.clear();
  console.log('[Storage] ✅ Storage cleared');
}