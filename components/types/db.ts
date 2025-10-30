import { SiteCategory, ProductCondition } from "./enums";

// Product - Consolidated view of a product across multiple visits
export interface Product {
  id: string; // UUID
  canonical_name: string; // AI-normalized name like "iPhone 13"
  
  // Latest visit data
  url: string;
  title: string; // Original title from last visit
  price?: string;
  discount?: string;
  condition: ProductCondition;
  category: string; // "electronics > mobile > smartphones"
  summary?: string;
  pros?: string[];
  cons?: string[];
  image?: string; // Best/main image
  
  // Tracking metadata
  first_seen: number; // Timestamp of first visit
  last_seen: number; // Timestamp of most recent visit
  visit_count: number; // How many times user viewed this product
  lowest_price?: string; // Best price seen
  lowest_price_url?: string; // URL where lowest price was found
}

// ProductHistory - Individual product page visits for price tracking
export interface ProductHistory {
  product_id: string; // Links to Product.id
  url: string;
  title: string;
  price?: string;
  discount?: string;
  condition: ProductCondition;
  timestamp: number;
}

// Site metadata - cached per domain
export interface SiteMeta {
  domain: string; // "github.com"
  category: SiteCategory;
  display_name?: string; // "GitHub" (prettier than domain)
  favicon?: string; // For UI display
  
  // Metadata
  first_categorized: number; // When we first analyzed this site
  last_updated: number; // Last time we re-checked (for rare updates)
  confidence: number; // 0-100, AI confidence in categorization
}

// SiteVisit - All page visits for natural language search
export interface SiteVisit {
  id: string; // UUID
  url: string;
  domain: string; // "github.com", "amazon.com"
  title: string;
  summary: string; // AI-generated summary of page content
  tags: string[]; // Main aspects/topics extracted by AI
  image?: string; // Main thumbnail
  
  // Site categorization
  site_category: SiteCategory; // Category of the site/domain
  
  // Product linking
  is_product: boolean;
  product_id?: string; // Links to Product.id if is_product=true
  
  timestamp: number;
}

// Chrome storage schema
export interface TabbyStorage {
  // Core data stores
  products: Record<string, Product>; // productId -> Product
  product_history: ProductHistory[]; // Flat array, sorted by timestamp
  site_visits: SiteVisit[]; // Flat array, sorted by timestamp
  
  // Site metadata cache
  site_metas: Record<string, SiteMeta>; // domain -> SiteMeta
  
  // Fast lookup indexes
  url_to_product: Record<string, string>; // URL -> product_id
  canonical_index: Record<string, string>; // lowercase canonical_name -> product_id
}

// Page data extracted from content script
export interface ExtractedPageData {
  url: string;
  title: string;
  summary?: string;
  tags?: string[];
  content?: string;
  images: string[];
  timestamp: number;
  
  // Site category
  site_category?: SiteCategory;
  
  // Storage flag
  worth_storing?: boolean; // Whether this page is worth storing (filters out landing pages, etc.)
  
  // Product-specific fields
  is_product?: boolean;
  product_price?: string;
  product_discount?: string;
  product_condition?: ProductCondition;
  product_category?: string; // ProductCategory enum value
  product_summary?: string;
  product_pros?: string[];
  product_cons?: string[];
}

// Search result for natural language history search
export interface SearchResult {
  visit: SiteVisit;
  relevance_score: number; // 0-100, AI-generated relevance to query
}

// Storage keys for chrome.storage.local
export const STORAGE_KEYS = {
  PRODUCTS: "products",
  PRODUCT_HISTORY: "product_history",
  SITE_VISITS: "site_visits",
  SITE_METAS: "site_metas",
  URL_TO_PRODUCT: "url_to_product",
  CANONICAL_INDEX: "canonical_index",
} as const;

// Storage limits
export const STORAGE_LIMITS = {
  MAX_PRODUCT_HISTORY: 1000, // Keep last 1000 product visits
  MAX_SITE_VISITS: 500, // Keep last 500 site visits
  MAX_SEARCH_RESULTS: 10, // Return top 10 search results
  RECENT_VISITS_FOR_SEARCH: 100, // Search only last 100 visits
  SITE_META_CACHE_DAYS: 90, // Re-categorize sites after 90 days
} as const;
