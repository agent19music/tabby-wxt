// types/index.ts

export interface SiteCategory {
  domain: string;
  category: string; // e.g., "Tech", "Shopping", "Social"
  metadata: {
    title: string;
    description?: string;
    keywords?: string;
  };
  firstIndexed: number; // timestamp
  favicon?: string;
  logoUrl?: string;
  siteColor?: string;
}

export interface ActivityLog {
  id: string;
  url: string;
  siteDomain: string;
  timestamp: number;
  isProductPage: boolean;
  tags: string[]; // 5-10 descriptive keywords
  summary: string; // one-sentence description
  pageText: string; // truncated for search
  imageUrls: string[]; // first 3 images
  featuredImage?: string; // Main image from the page
  screenshotUrl?: string; // Optional captured screenshot
  favicon?: string; // Site favicon
  pageTitle: string; // HTML title tag
  readingTime?: number; // Estimated reading time in seconds
}

export interface ListingPricePoint {
  price: number;
  timestamp: number;
}

export interface ProductListing {
  site: string;
  url: string;
  price: number;
  currency: string;
  condition: 'new' | 'refurbished' | 'unknown';
  discountPercent: number | null;
  sellerName?: string; // for eBay, etc.
  scrapedAt: number;
  imageUrl?: string; // Primary product image from that listing
  thumbnailUrl?: string; // Optimized thumbnail
  availability: 'in-stock' | 'out-of-stock' | 'pre-order' | 'unknown';
  shippingInfo?: string;
  rating?: number; // Listing-specific rating
  reviewCount?: number;
  priceHistory?: ListingPricePoint[]; // Track price changes over time
}

export interface ReviewMetadata {
  thumbnailUrl?: string; // For video reviews or article featured images
  videoLength?: string; // e.g., "15:30"
  publicationDate?: number; // timestamp
}

export interface ProductReview extends ReviewMetadata {
  title: string;
  url: string;
  source: string; // e.g., "YouTube", "CNET"
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  reviewerName?: string;
  addedAt: number;
}

export interface PriceSnapshot {
  price: number;
  currency: string;
  site: string;
  url?: string;
}

export interface ProductAlerts {
  priceDropBelow?: number;
  backInStock?: boolean;
}

export interface IndexedProduct {
  id: string;
  mainTitle: string; // normalized product name
  category: string; // max 3 levels: "electronics.audio.headphones"
  listings: ProductListing[];
  reviews: ProductReview[];
  firstSeen: number;
  lastUpdated: number;
  aiSummary?: string; // AI-generated comparison summary
  aiRecommendation?: string;
  primaryImage?: string; // Hero image
  imageGallery?: string[]; // Additional images
  brand?: string;
  specifications?: Record<string, string>;
  lowestPrice?: PriceSnapshot; // Cache for quick display
  highestPrice?: PriceSnapshot;
  averageRating?: number; // Across all reviews/listings
  userNotes?: string;
  lastViewed?: number;
  viewCount?: number;
  alerts?: ProductAlerts;
  comparisonIds?: string[]; // IDs of ProductComparison records
}

export interface CartItem {
  productId: string;
  selectedListingUrl: string;
  quantity: number;
  addedAt: number;
  notes?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface ProductComparison {
  id: string;
  productIds: string[];
  createdAt: number;
  userNotes?: string;
}

export interface PriceAlert {
  id: string;
  productId: string;
  targetPrice: number;
  currency: string;
  active: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface StorageSchema {
  siteCategories: Record<string, SiteCategory>; // domain -> category
  activityLog: ActivityLog[];
  indexedProducts: IndexedProduct[];
  cartItems: CartItem[];
  currentProduct: IndexedProduct | null;
  productComparisons: ProductComparison[];
  priceAlerts: PriceAlert[];
}