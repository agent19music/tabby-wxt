// Chrome Storage API for products and site visits
// This allows access to data from any context (popup, sidepanel, background, content scripts)
import type {
  Product,
  ProductHistory,
  SiteVisit,
  SiteMeta,
  ExtractedPageData,
} from "../../types/db";
import { SiteCategory, ProductCondition } from "../../types/enums";

// Storage keys
const STORAGE_KEYS = {
  PRODUCTS: "products",
  PRODUCT_HISTORY: "product_history",
  SITE_VISITS: "site_visits",
  SITE_METAS: "site_metas",
  URL_TO_PRODUCT: "url_to_product",
  CANONICAL_INDEX: "canonical_index",
} as const;

// Storage limits
const LIMITS = {
  MAX_PRODUCT_HISTORY: 1000,
  MAX_SITE_VISITS: 500,
  RESCAN_INTERVAL_MS: 72 * 60 * 60 * 1000, // 72 hours in milliseconds
} as const;

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Check if a URL was visited within the last 72 hours
 * Returns true if the URL should be scanned (not recently visited or never visited)
 * Returns false if the URL was recently visited (skip scanning)
 */
export async function shouldScanUrl(url: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
    const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
    
    const now = Date.now();
    const cutoffTime = now - LIMITS.RESCAN_INTERVAL_MS;
    
    // Find the most recent visit to this exact URL
    const recentVisit = visitsArray.find(
      visit => visit.url === url && visit.timestamp > cutoffTime
    );
    
    if (recentVisit) {
      const hoursSince = Math.floor((now - recentVisit.timestamp) / (1000 * 60 * 60));
      const hoursRemaining = 72 - hoursSince;
      console.log(`⏭️ URL was visited ${hoursSince} hours ago. Skipping scan (${hoursRemaining} hours until next scan allowed).`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking if URL should be scanned:", error);
    // On error, default to allowing the scan
    return true;
  }
}

/**
 * Get the last visit timestamp for a URL
 */
export async function getLastVisitTime(url: string): Promise<number | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
    const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
    
    // Find the most recent visit to this exact URL
    const visits = visitsArray.filter(visit => visit.url === url);
    if (visits.length === 0) {
      return null;
    }
    
    // Sort by timestamp descending and get the first one
    visits.sort((a, b) => b.timestamp - a.timestamp);
    return visits[0].timestamp;
  } catch (error) {
    console.error("Error getting last visit time:", error);
    return null;
  }
}

/**
 * Get all products from storage
 */
export async function getAllProducts(): Promise<Product[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCTS);
  const productsMap = (result[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
  return Object.values(productsMap);
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCTS);
  const productsMap = (result[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
  return productsMap[id] || null;
}

/**
 * Update a product with partial data
 */
export async function updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCTS);
    const productsMap = (result[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
    
    const existingProduct = productsMap[id];
    if (!existingProduct) {
      console.error(`Product ${id} not found`);
      return false;
    }
    
    // Merge updates
    productsMap[id] = {
      ...existingProduct,
      ...updates,
    };
    
    await chrome.storage.local.set({ [STORAGE_KEYS.PRODUCTS]: productsMap });
    console.log(`✅ Product ${id} updated`);
    return true;
  } catch (error) {
    console.error("Failed to update product:", error);
    return false;
  }
}

/**
 * Get or create site metadata
 */
async function getOrCreateSiteMeta(
  domain: string,
  siteCategory?: SiteCategory
): Promise<SiteMeta> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_METAS);
  const metasMap = (result[STORAGE_KEYS.SITE_METAS] as Record<string, SiteMeta>) || {};
  
  const existing = metasMap[domain];
  if (existing) {
    return existing;
  }

  // Create new site meta
  return {
    domain,
    category: siteCategory || SiteCategory.UNKNOWN,
    first_categorized: Date.now(),
    last_updated: Date.now(),
    confidence: siteCategory ? 80 : 0,
  };
}

/**
 * Save site metadata
 */
async function saveSiteMeta(meta: SiteMeta): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_METAS);
  const metasMap = (result[STORAGE_KEYS.SITE_METAS] as Record<string, SiteMeta>) || {};
  metasMap[meta.domain] = meta;
  await chrome.storage.local.set({ [STORAGE_KEYS.SITE_METAS]: metasMap });
}

/**
 * Find existing product by URL or canonical name
 */
async function findExistingProduct(
  url: string,
  canonicalName?: string
): Promise<Product | null> {
  const [productsResult, urlIndexResult, canonicalIndexResult] = await Promise.all([
    chrome.storage.local.get(STORAGE_KEYS.PRODUCTS),
    chrome.storage.local.get(STORAGE_KEYS.URL_TO_PRODUCT),
    chrome.storage.local.get(STORAGE_KEYS.CANONICAL_INDEX),
  ]);

  const productsMap = (productsResult[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
  const urlToProduct = (urlIndexResult[STORAGE_KEYS.URL_TO_PRODUCT] as Record<string, string>) || {};
  const canonicalIndex = (canonicalIndexResult[STORAGE_KEYS.CANONICAL_INDEX] as Record<string, string>) || {};

  // Check URL index first
  const productIdByUrl = urlToProduct[url];
  if (productIdByUrl && productsMap[productIdByUrl]) {
    return productsMap[productIdByUrl];
  }

  // Check canonical name index
  if (canonicalName) {
    const canonicalKey = canonicalName.toLowerCase();
    const productIdByCanonical = canonicalIndex[canonicalKey];
    if (productIdByCanonical && productsMap[productIdByCanonical]) {
      return productsMap[productIdByCanonical];
    }
  }

  return null;
}

/**
 * Save or update a product
 */
async function saveProduct(product: Product): Promise<void> {
  const [productsResult, urlIndexResult, canonicalIndexResult] = await Promise.all([
    chrome.storage.local.get(STORAGE_KEYS.PRODUCTS),
    chrome.storage.local.get(STORAGE_KEYS.URL_TO_PRODUCT),
    chrome.storage.local.get(STORAGE_KEYS.CANONICAL_INDEX),
  ]);

  const productsMap = (productsResult[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
  const urlToProduct = (urlIndexResult[STORAGE_KEYS.URL_TO_PRODUCT] as Record<string, string>) || {};
  const canonicalIndex = (canonicalIndexResult[STORAGE_KEYS.CANONICAL_INDEX] as Record<string, string>) || {};

  // Update product
  productsMap[product.id] = product;
  
  // Update indexes
  urlToProduct[product.url] = product.id;
  canonicalIndex[product.canonical_name.toLowerCase()] = product.id;

  await chrome.storage.local.set({
    [STORAGE_KEYS.PRODUCTS]: productsMap,
    [STORAGE_KEYS.URL_TO_PRODUCT]: urlToProduct,
    [STORAGE_KEYS.CANONICAL_INDEX]: canonicalIndex,
  });
}

/**
 * Save product history entry
 */
async function saveProductHistory(history: ProductHistory): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCT_HISTORY);
  let historyArray = (result[STORAGE_KEYS.PRODUCT_HISTORY] as ProductHistory[]) || [];
  
  // Add new history entry
  historyArray.push(history);
  
  // Sort by timestamp (newest first) and limit size
  historyArray.sort((a, b) => b.timestamp - a.timestamp);
  if (historyArray.length > LIMITS.MAX_PRODUCT_HISTORY) {
    historyArray = historyArray.slice(0, LIMITS.MAX_PRODUCT_HISTORY);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.PRODUCT_HISTORY]: historyArray });
}

/**
 * Save site visit
 */
async function saveSiteVisit(visit: SiteVisit): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
  let visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
  
  // Add new visit
  visitsArray.push(visit);
  
  // Sort by timestamp (newest first) and limit size
  visitsArray.sort((a, b) => b.timestamp - a.timestamp);
  if (visitsArray.length > LIMITS.MAX_SITE_VISITS) {
    visitsArray = visitsArray.slice(0, LIMITS.MAX_SITE_VISITS);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.SITE_VISITS]: visitsArray });
}

/**
 * Compare two price strings (basic implementation)
 */
function comparePrice(price1: string, price2: string): number {
  const num1 = parseFloat(price1.replace(/[^0-9.]/g, ""));
  const num2 = parseFloat(price2.replace(/[^0-9.]/g, ""));
  return num1 - num2;
}

/**
 * Main function to store extracted page data
 */
export async function storePageData(
  pageData: ExtractedPageData
): Promise<{ productId?: string; visitId: string }> {
  try {
    const domain = extractDomain(pageData.url);
    const timestamp = pageData.timestamp || Date.now();

    // Get or create site metadata
    const siteMeta = await getOrCreateSiteMeta(
      domain,
      pageData.site_category
    );
    if (!siteMeta.category && pageData.site_category) {
      siteMeta.category = pageData.site_category;
      siteMeta.last_updated = timestamp;
      await saveSiteMeta(siteMeta);
    }

    let productId: string | undefined;

    // Handle product pages
    if (pageData.is_product && pageData.title) {
      const canonicalName = pageData.title;
      let product = await findExistingProduct(pageData.url, canonicalName);

      if (product) {
        // Update existing product
        product.url = pageData.url;
        product.title = pageData.title;
        product.last_seen = timestamp;
        product.visit_count += 1;

        if (pageData.product_price) {
          product.price = pageData.product_price;
          if (!product.lowest_price || comparePrice(pageData.product_price, product.lowest_price) < 0) {
            product.lowest_price = pageData.product_price;
            product.lowest_price_url = pageData.url;
          }
        }
        if (pageData.product_discount) product.discount = pageData.product_discount;
        if (pageData.product_condition) product.condition = pageData.product_condition as ProductCondition;
        if (pageData.product_category) product.category = pageData.product_category;
        if (pageData.product_summary) product.summary = pageData.product_summary;
        if (pageData.product_pros) product.pros = pageData.product_pros;
        if (pageData.product_cons) product.cons = pageData.product_cons;
        if (pageData.images?.[0]) product.image = pageData.images[0];
      } else {
        // Create new product
        const newProductId = generateUUID();
        product = {
          id: newProductId,
          canonical_name: canonicalName,
          url: pageData.url,
          title: pageData.title,
          price: pageData.product_price,
          discount: pageData.product_discount,
          condition: pageData.product_condition || ProductCondition.UNKNOWN,
          category: pageData.product_category || "other",
          summary: pageData.product_summary,
          pros: pageData.product_pros,
          cons: pageData.product_cons,
          image: pageData.images?.[0],
          first_seen: timestamp,
          last_seen: timestamp,
          visit_count: 1,
          lowest_price: pageData.product_price,
          lowest_price_url: pageData.url,
        };
      }

      if (product) {
        await saveProduct(product);
        productId = product.id;

        const history: ProductHistory = {
          product_id: product.id,
          url: pageData.url,
          title: pageData.title,
          price: pageData.product_price,
          discount: pageData.product_discount,
          condition: pageData.product_condition || ProductCondition.UNKNOWN,
          timestamp,
        };
        await saveProductHistory(history);
      }
    }

    // Save site visit
    const visitId = generateUUID();
    const siteVisit: SiteVisit = {
      id: visitId,
      url: pageData.url,
      domain,
      title: pageData.title,
      summary: pageData.summary || "",
      tags: pageData.tags || [],
      image: pageData.images?.[0],
      site_category: pageData.site_category || siteMeta.category,
      is_product: pageData.is_product || false,
      product_id: productId,
      timestamp,
    };
    await saveSiteVisit(siteVisit);

    console.log("✅ Stored page data successfully:", { productId, visitId });
    return { productId, visitId };
  } catch (error) {
    console.error("Failed to store page data:", error);
    throw error;
  }
}

/**
 * Get product history for a specific product
 */
export async function getProductHistory(productId: string): Promise<ProductHistory[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.PRODUCT_HISTORY);
  const historyArray = (result[STORAGE_KEYS.PRODUCT_HISTORY] as ProductHistory[]) || [];
  return historyArray.filter(h => h.product_id === productId);
}

/**
 * Get recent site visits
 */
export async function getRecentSiteVisits(limit: number = 100): Promise<SiteVisit[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
  const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
  return visitsArray.slice(0, limit);
}

/**
 * Get site visits by category
 */
export async function getSiteVisitsByCategory(category: SiteCategory): Promise<SiteVisit[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
  const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
  return visitsArray.filter(v => v.site_category === category);
}

/**
 * Get all site visits
 */
export async function getAllSiteVisits(productsOnly?: boolean): Promise<SiteVisit[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
  const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
  if (productsOnly) {
    return visitsArray.filter(v => v.is_product);
  }
  return visitsArray;
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  productCount: number;
  historyCount: number;
  visitCount: number;
  siteMetaCount: number;
  bytesInUse?: number;
}> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.PRODUCTS,
    STORAGE_KEYS.PRODUCT_HISTORY,
    STORAGE_KEYS.SITE_VISITS,
    STORAGE_KEYS.SITE_METAS,
  ]);

  const productsMap = (result[STORAGE_KEYS.PRODUCTS] as Record<string, Product>) || {};
  const historyArray = (result[STORAGE_KEYS.PRODUCT_HISTORY] as ProductHistory[]) || [];
  const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
  const metasMap = (result[STORAGE_KEYS.SITE_METAS] as Record<string, SiteMeta>) || {};

  let bytesInUse: number | undefined;
  if (chrome.storage.local.getBytesInUse) {
    bytesInUse = await chrome.storage.local.getBytesInUse(null);
  }

  return {
    productCount: Object.keys(productsMap).length,
    historyCount: historyArray.length,
    visitCount: visitsArray.length,
    siteMetaCount: Object.keys(metasMap).length,
    bytesInUse,
  };
}

/**
 * Clear all data
 */
export async function clearAllData(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.PRODUCTS,
    STORAGE_KEYS.PRODUCT_HISTORY,
    STORAGE_KEYS.SITE_VISITS,
    STORAGE_KEYS.SITE_METAS,
    STORAGE_KEYS.URL_TO_PRODUCT,
    STORAGE_KEYS.CANONICAL_INDEX,
  ]);
  console.log("✅ All storage data cleared");
}
