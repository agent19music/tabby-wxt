import type {
  ActivityLog,
  IndexedProduct,
  ListingPricePoint,
  ProductListing,
  StorageSchema,
} from '@/types';

export async function migrateStorageSchema() {
  const storage = await getAllStorage();

  const migrated: Partial<StorageSchema> = { ...storage } as Partial<StorageSchema>;

  migrated.indexedProducts = (storage.indexedProducts || []).map(migrateProduct);
  migrated.activityLog = (storage.activityLog || []).map(migrateActivityLog);
  migrated.cartItems = storage.cartItems || [];
  migrated.productComparisons = storage.productComparisons || [];
  migrated.priceAlerts = storage.priceAlerts || [];

  if (typeof migrated.currentProduct === 'object' && migrated.currentProduct) {
    migrated.currentProduct = migrateProduct(migrated.currentProduct);
  }

  await chrome.storage.local.set(migrated);
  console.log('[Migration] ✅ Schema updated');
}

async function getAllStorage(): Promise<Partial<StorageSchema>> {
  const raw = await chrome.storage.local.get(null);
  return (raw || {}) as Partial<StorageSchema>;
}

function migrateActivityLog(entry: ActivityLog): ActivityLog {
  return {
    ...entry,
    pageTitle: entry.pageTitle || entry.summary || '',
    favicon: entry.favicon || undefined,
    featuredImage: entry.featuredImage || entry.imageUrls?.[0],
    readingTime: entry.readingTime || estimateReadingTime(entry.pageText || ''),
    screenshotUrl: entry.screenshotUrl || undefined,
  };
}

function migrateProduct(product: IndexedProduct): IndexedProduct {
  const listings = Array.isArray(product.listings)
    ? product.listings.map(migrateListing)
    : [];

  const imageGallery = Array.isArray(product.imageGallery)
    ? product.imageGallery.filter(Boolean)
    : [];

  const primaryImage =
    product.primaryImage ||
    imageGallery[0] ||
    listings.find((listing: ProductListing) => Boolean(listing.imageUrl))?.imageUrl ||
    listings.find((listing: ProductListing) => Boolean(listing.thumbnailUrl))?.thumbnailUrl ||
    null;

  const reviews = Array.isArray(product.reviews) ? product.reviews : [];
  const averageRating =
    typeof product.averageRating === 'number'
      ? product.averageRating
      : calculateAverageRating(listings, reviews);

  const lowestPrice = Array.isArray(listings) && listings.length
    ? findExtremalPrice(listings, 'min')
    : undefined;
  const highestPrice = Array.isArray(listings) && listings.length
    ? findExtremalPrice(listings, 'max')
    : undefined;

  return {
    ...product,
    listings,
    imageGallery,
    primaryImage: primaryImage || undefined,
    averageRating,
    lowestPrice,
    highestPrice,
    specifications: product.specifications || {},
    userNotes: product.userNotes || '',
    lastViewed: product.lastViewed || product.lastUpdated || product.firstSeen,
    viewCount: typeof product.viewCount === 'number' ? product.viewCount : 0,
    alerts: product.alerts || {},
    comparisonIds: Array.isArray(product.comparisonIds) ? product.comparisonIds : [],
  };
}

function migrateListing(listing: ProductListing): ProductListing {
  const priceHistory: ListingPricePoint[] = Array.isArray(listing.priceHistory)
    ? listing.priceHistory
    : [];

  if (typeof listing.price === 'number' && priceHistory.length === 0) {
    priceHistory.push({ price: listing.price, timestamp: listing.scrapedAt || Date.now() });
  }

  const availability = listing.availability || 'unknown';

  return {
    ...listing,
    availability,
    imageUrl: listing.imageUrl || listing.thumbnailUrl || undefined,
    thumbnailUrl: listing.thumbnailUrl || listing.imageUrl || undefined,
    priceHistory,
    shippingInfo: listing.shippingInfo || undefined,
    rating: typeof listing.rating === 'number' ? listing.rating : undefined,
    reviewCount:
      typeof listing.reviewCount === 'number' ? listing.reviewCount : undefined,
  };
}

function estimateReadingTime(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 180;
  return Math.max(15, Math.round(minutes * 60));
}

function calculateAverageRating(
  listings: ProductListing[],
  reviews: Array<{ sentiment?: string; rating?: number }>
): number | undefined {
  const ratingValues: number[] = [];

  listings.forEach((listing) => {
    if (typeof listing.rating === 'number') {
      ratingValues.push(listing.rating);
    }
  });

  reviews.forEach((review) => {
    if (typeof review.rating === 'number') {
      ratingValues.push(review.rating);
    }
  });

  if (ratingValues.length === 0) {
    return undefined;
  }

  const sum = ratingValues.reduce((acc, rating) => acc + rating, 0);
  return Number((sum / ratingValues.length).toFixed(2));
}

function findExtremalPrice(listings: ProductListing[], mode: 'min' | 'max') {
  const sorted = [...listings].filter((listing) => typeof listing.price === 'number');
  if (sorted.length === 0) {
    return undefined;
  }

  sorted.sort((a, b) => (mode === 'min' ? a.price - b.price : b.price - a.price));
  const target = sorted[0];

  return {
    price: target.price,
    currency: target.currency,
    site: target.site,
    url: target.url,
  };
}

declare const chrome: {
  storage: {
    local: {
      get(keys: null | string | string[]): Promise<Record<string, unknown>>;
      set(data: Record<string, unknown>): Promise<void>;
    };
  };
};
