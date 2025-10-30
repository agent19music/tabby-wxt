import type {
  ActivityLog,
  IndexedProduct,
  ProductListing,
  SiteCategory,
  StorageSchema,
} from '@/types';
import type { EnhancedProductData, PageData } from '@/components/functions/content_scanner';
import { getOptimizedImageUrl } from '@/utils/image-helpers';
import { migrateStorageSchema } from '@/utils/migrations';

type AIPageAnalysis = {
  isProductPage: boolean;
  tags: string[];
  summary: string;
};

type AIParsedProduct = {
  productTitle: string;
  brand?: string;
  categories?: string[];
  categoryString?: string;
  price?: number;
  currency?: string;
  condition?: 'new' | 'refurbished' | 'unknown';
  discountPercent?: number | null;
  primaryImage?: string;
  imageGallery?: string[];
  rating?: number;
  reviewCount?: number;
  availability?: 'in-stock' | 'out-of-stock' | 'pre-order' | 'unknown';
  specifications?: Record<string, string>;
};

type StorageChange = { oldValue?: unknown; newValue?: unknown };

declare const defineBackground: <T>(factory: () => T) => T;
declare const chrome: {
  offscreen?: {
    createDocument(options: Record<string, unknown>): Promise<void>;
  };
  runtime: {
    sendMessage(message: unknown, callback?: (response: any) => void): void;
    lastError?: Error;
    onInstalled: {
      addListener(listener: () => void | Promise<void>): void;
    };
  };
  storage: {
    local: {
      get(keys: null | string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      clear(): Promise<void>;
    };
    onChanged: {
      addListener(
        listener: (changes: Record<string, StorageChange>, areaName: string) => void
      ): void;
    };
  };
  webNavigation: {
    onCompleted: {
      addListener(listener: (details: Record<string, any>) => void): void;
    };
  };
  tabs: {
    onUpdated: {
      addListener(
        listener: (
          tabId: number,
          changeInfo: Record<string, any>,
          tab: Record<string, any>
        ) => void
      ): void;
    };
    sendMessage<T = unknown>(tabId: number, message: unknown): Promise<T>;
  };
  scripting: {
    executeScript(options: Record<string, unknown>): Promise<Array<{ result?: unknown }>>;
  };
  history?: {
    search(query: { text: string; startTime: number; maxResults: number }): Promise<
      Array<{ url?: string }>
    >;
  };
};

declare const process: { env: Record<string, string | undefined> };

const ACTIVITY_LOG_LIMIT = 1000;

export default defineBackground(() => {
  console.log('[Background] Tabby service worker initialized');

  let offscreenCreated = false;

  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await migrateStorageSchema();
    } catch (error) {
      console.error('[Background] Storage migration failed', error);
    }
  });

  async function ensureOffscreenDocument() {
    if (offscreenCreated || !chrome.offscreen?.createDocument) {
      return;
    }

    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['WORKERS'],
        justification: 'Run on-device AI processing',
      });
      offscreenCreated = true;
      console.log('[Background] Offscreen document created');
    } catch (error) {
      console.error('[Background] Offscreen creation error:', error);
    }
  }

  function generateId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  async function requestAI<TResponse>(
    type: string,
    data: unknown
  ): Promise<TResponse> {
    await ensureOffscreenDocument();

    return new Promise((resolve, reject) => {
      const requestId = generateId(type);
      chrome.runtime.sendMessage({ type, data, requestId }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response as TResponse);
      });
    });
  }

  async function fetchPageData(tabId: number): Promise<PageData | null> {
    try {
      const response = await chrome.tabs.sendMessage<{ success: boolean; data: PageData }>(
        tabId,
        { action: 'getPageContent', force: true }
      );
      if (response?.success) {
        return response.data;
      }
    } catch (error) {
      console.warn('[Background] Content script snapshot failed, falling back', error);
    }

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const text = document.body?.innerText || '';
          const title = document.title || '';
          const images = Array.from(document.querySelectorAll('img'))
            .map((img) => img.getAttribute('src') || '')
            .filter(Boolean)
            .slice(0, 5);

          return {
            url: window.location.href,
            title,
            content: text.slice(0, 10000),
            headings: [],
            images,
            timestamp: Date.now(),
            html: '',
            metadata: {
              ogTitle: title,
            },
            favicon:
              document
                .querySelector('link[rel="icon"], link[rel="shortcut icon"]')
                ?.getAttribute('href') || undefined,
            structuredData: [],
            productData: null,
          } satisfies PageData;
        },
      });

      if (result?.result) {
        return result.result as PageData;
      }
    } catch (error) {
      console.error('[Background] Fallback page extraction failed', error);
    }

    return null;
  }

  async function appendActivityLog(entry: ActivityLog) {
    const stored = await chrome.storage.local.get('activityLog');
    const activityLog = (stored.activityLog || []) as ActivityLog[];
    activityLog.push(entry);

    while (activityLog.length > ACTIVITY_LOG_LIMIT) {
      activityLog.shift();
    }

    await chrome.storage.local.set({ activityLog });
  }

  async function categorizeSiteIfNeeded(details: { url?: string; tabId?: number }) {
    if (!details.url || !details.tabId) return;
    if (!details.url.startsWith('http')) return;

    const domain = new URL(details.url).hostname;
    const stored = await chrome.storage.local.get('siteCategories');
    const siteCategories = (stored.siteCategories || {}) as Record<string, SiteCategory>;

    if (siteCategories[domain]) {
      return;
    }

    const pageData = await fetchPageData(details.tabId);
    if (!pageData) return;

    const metadata = {
      title: pageData.title,
      description: pageData.metadata.description,
      keywords: pageData.metadata.keywords,
    } satisfies SiteCategory['metadata'];

    try {
      const aiResponse = await requestAI<{ category: string }>('categorize-site', metadata);

      const newCategory: SiteCategory = {
        domain,
        category: aiResponse.category,
        metadata,
        firstIndexed: Date.now(),
        favicon: pageData.favicon,
        logoUrl: pageData.favicon,
        siteColor: undefined,
      };

      siteCategories[domain] = newCategory;
      await chrome.storage.local.set({ siteCategories });
    } catch (error) {
      console.error('[Background] Site categorization error:', error);
    }
  }

  chrome.webNavigation.onCompleted.addListener(async (details) => {
    try {
      await categorizeSiteIfNeeded(details);
    } catch (error) {
      console.error('[Background] Navigation listener error:', error);
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || !tab.url.startsWith('http')) return;

    try {
      const pageData = await fetchPageData(tabId);
      if (!pageData) return;

      const aiAnalysis = await requestAI<AIPageAnalysis>('analyze-page', {
        text: pageData.content,
        images: pageData.images,
        url: tab.url,
      });

      const activityEntry = buildActivityLogEntry(pageData, aiAnalysis, tab.url);
      await appendActivityLog(activityEntry);

      if (activityEntry.isProductPage) {
        await handleProductPage(tab.url, pageData);
      }
    } catch (error) {
      console.error('[Background] Tab update handling error:', error);
    }
  });

  async function handleProductPage(url: string, pageData: PageData) {
    try {
      const aiProduct = await requestAI<AIParsedProduct>('parse-product', {
        text: pageData.content,
        url,
        html: pageData.html,
        metadata: { brand: pageData.productData?.brand || pageData.metadata.brand },
      });

      const listing = buildListing(url, aiProduct, pageData.productData);
      if (!listing) {
        console.warn('[Background] Skipping product indexing, missing price:', url);
        return;
      }

      const updatedProduct = await upsertProductRecord(aiProduct, listing, pageData);
      if (updatedProduct) {
        await chrome.storage.local.set({ currentProduct: updatedProduct });
      }
    } catch (error) {
      console.error('[Background] Product handling error:', error);
    }
  }

  function buildActivityLogEntry(
    pageData: PageData,
    analysis: AIPageAnalysis,
    url: string
  ): ActivityLog {
    const domain = new URL(url).hostname;
    const featuredImage =
      pageData.productData?.primaryImage ||
      pageData.metadata.ogImage ||
      pageData.images[0];

    return {
      id: generateId('log'),
      url,
      siteDomain: domain,
      timestamp: Date.now(),
      isProductPage: analysis.isProductPage || Boolean(pageData.productData),
      tags: dedupeStrings(analysis.tags),
      summary: analysis.summary,
      pageText: pageData.content.slice(0, 2000),
      imageUrls: pageData.images.slice(0, 3),
      featuredImage,
      screenshotUrl: undefined,
      favicon: pageData.favicon,
      pageTitle: pageData.title,
      readingTime: estimateReadingTime(pageData.content),
    };
  }

  function buildListing(
    url: string,
    aiProduct: AIParsedProduct,
    scrapedProduct: EnhancedProductData | null
  ): ProductListing | null {
    const site = new URL(url).hostname;

    const price = coerceNumber(aiProduct.price);
    if (price === undefined) {
      return null;
    }

    const currency = aiProduct.currency || 'USD';
    const primaryImage = scrapedProduct?.primaryImage || aiProduct.primaryImage;
    const thumbnail = getOptimizedImageUrl(primaryImage, 'thumbnail');

    const availability = normalizeAvailability(
      scrapedProduct?.availability || aiProduct.availability
    );

    const listing: ProductListing = {
      site,
      url,
      price,
      currency,
      condition: aiProduct.condition || 'unknown',
      discountPercent:
        aiProduct.discountPercent !== undefined ? aiProduct.discountPercent : null,
      sellerName: undefined,
      scrapedAt: Date.now(),
      imageUrl: getOptimizedImageUrl(primaryImage, 'large'),
      thumbnailUrl: thumbnail,
      availability,
      shippingInfo: scrapedProduct?.shippingInfo,
      rating: scrapedProduct?.rating || aiProduct.rating,
      reviewCount: scrapedProduct?.reviewCount || aiProduct.reviewCount,
      priceHistory: [
        {
          price,
          timestamp: Date.now(),
        },
      ],
    };

    return listing;
  }

  async function upsertProductRecord(
    aiProduct: AIParsedProduct,
    listing: ProductListing,
    pageData: PageData
  ): Promise<IndexedProduct | null> {
    const stored = await chrome.storage.local.get(['indexedProducts', 'productComparisons']);
    const indexedProducts = (stored.indexedProducts || []) as IndexedProduct[];

    const normalizedTitle = aiProduct.productTitle?.trim();
    let targetProduct = indexedProducts.find((product) =>
      product.listings.some((existing) => existing.url === listing.url)
    );

    if (!targetProduct && normalizedTitle) {
      targetProduct = indexedProducts.find(
        (product) => product.mainTitle.toLowerCase() === normalizedTitle.toLowerCase()
      );
    }

    if (!targetProduct && normalizedTitle && indexedProducts.length > 0) {
      try {
        const similarity = await requestAI<{ matchedTitle: string | null }>('check-similarity', {
          newTitle: normalizedTitle,
          existingTitles: indexedProducts.map((product) => product.mainTitle),
        });
        if (similarity.matchedTitle) {
          targetProduct = indexedProducts.find(
            (product) => product.mainTitle === similarity.matchedTitle
          );
        }
      } catch (error) {
        console.warn('[Background] Similarity check failed', error);
      }
    }

    if (targetProduct) {
      mergeListing(targetProduct, listing);
      mergeProductMetadata(targetProduct, aiProduct, pageData.productData);
      recalculateProductAggregates(targetProduct);
      await chrome.storage.local.set({ indexedProducts });

      if ((targetProduct.listings || []).length >= 2) {
        await generateProductSummary(targetProduct, indexedProducts);
      }

      return targetProduct;
    }

    if (!normalizedTitle) {
      return null;
    }

    const newProduct: IndexedProduct = {
      id: generateId('product'),
      mainTitle: normalizedTitle,
      category: aiProduct.categoryString || (aiProduct.categories || []).join('.') || 'uncategorized',
      listings: [listing],
      reviews: [],
      firstSeen: Date.now(),
      lastUpdated: Date.now(),
      primaryImage: listing.imageUrl || listing.thumbnailUrl,
      imageGallery: mergeImageGallery([], pageData.productData?.imageGallery, aiProduct.imageGallery),
      brand: aiProduct.brand || pageData.productData?.brand,
      specifications: mergeSpecifications({}, aiProduct.specifications, pageData.productData?.specifications),
      averageRating: listing.rating,
      userNotes: '',
      lastViewed: Date.now(),
      viewCount: 1,
      alerts: {},
      comparisonIds: [],
      lowestPrice: {
        price: listing.price,
        currency: listing.currency,
        site: listing.site,
        url: listing.url,
      },
      highestPrice: {
        price: listing.price,
        currency: listing.currency,
        site: listing.site,
        url: listing.url,
      },
    };

    indexedProducts.push(newProduct);
    await chrome.storage.local.set({ indexedProducts });

    return newProduct;
  }

  function mergeListing(product: IndexedProduct, listing: ProductListing) {
    const existing = product.listings.find((item) => item.url === listing.url);

    if (existing) {
      if (existing.price !== listing.price) {
        existing.priceHistory = existing.priceHistory || [];
        existing.priceHistory.push({ price: listing.price, timestamp: Date.now() });
        existing.price = listing.price;
      }

      existing.currency = listing.currency;
      existing.condition = listing.condition;
      existing.discountPercent = listing.discountPercent;
      existing.availability = listing.availability;
      existing.shippingInfo = listing.shippingInfo;
      existing.rating = listing.rating;
      existing.reviewCount = listing.reviewCount;
      existing.imageUrl = listing.imageUrl || existing.imageUrl;
      existing.thumbnailUrl = listing.thumbnailUrl || existing.thumbnailUrl;
      existing.scrapedAt = Date.now();
    } else {
      product.listings.push(listing);
    }

    product.lastUpdated = Date.now();
  }

  function mergeProductMetadata(
    product: IndexedProduct,
    aiProduct: AIParsedProduct,
    scraped: EnhancedProductData | null
  ) {
    product.primaryImage = product.primaryImage || scraped?.primaryImage || aiProduct.primaryImage;
    product.imageGallery = mergeImageGallery(
      product.imageGallery || [],
      scraped?.imageGallery,
      aiProduct.imageGallery
    );

    product.brand = product.brand || aiProduct.brand || scraped?.brand;
    product.specifications = mergeSpecifications(
      product.specifications || {},
      aiProduct.specifications,
      scraped?.specifications
    );

    if (product.alerts === undefined) {
      product.alerts = {};
    }
  }

  function mergeImageGallery(
    existing: string[],
    ...sources: Array<string[] | undefined>
  ): string[] {
    const all = [...existing];
    sources.forEach((source) => {
      if (!Array.isArray(source)) return;
      source.forEach((item) => {
        if (!item) return;
        if (all.indexOf(item) === -1) {
          all.push(item);
        }
      });
    });
    return all;
  }

  function mergeSpecifications(
    base: Record<string, string>,
    ...sources: Array<Record<string, string> | undefined>
  ) {
    const merged = { ...base };
    sources.forEach((source) => {
      if (!source) return;
      for (const key in source) {
        if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
        const value = source[key];
        if (!merged[key]) {
          merged[key] = value;
        }
      }
    });
    return merged;
  }

  function recalculateProductAggregates(product: IndexedProduct) {
    if (product.listings.length) {
      const sorted = [...product.listings].sort((a, b) => a.price - b.price);
      const lowest = sorted[0];
      const highest = sorted[sorted.length - 1];

      product.lowestPrice = {
        price: lowest.price,
        currency: lowest.currency,
        site: lowest.site,
        url: lowest.url,
      };

      product.highestPrice = {
        price: highest.price,
        currency: highest.currency,
        site: highest.site,
        url: highest.url,
      };
    }

    const ratingValues: number[] = [];
    product.listings.forEach((listing) => {
      if (typeof listing.rating === 'number') {
        ratingValues.push(listing.rating);
      }
    });

    if (ratingValues.length) {
      const sum = ratingValues.reduce((acc, rating) => acc + rating, 0);
      product.averageRating = Number((sum / ratingValues.length).toFixed(2));
    }

    product.lastViewed = Date.now();
    product.viewCount = (product.viewCount || 0) + 1;
  }

  function normalizeAvailability(value?: string | null) {
    if (!value) return 'unknown';
    const normalized = value.toLowerCase();
    if (normalized.includes('instock')) return 'in-stock';
    if (normalized.includes('preorder') || normalized.includes('pre-order')) return 'pre-order';
    if (normalized.includes('outofstock') || normalized.includes('out of stock')) return 'out-of-stock';
    if (normalized.includes('available')) return 'in-stock';
    return 'unknown';
  }

  function coerceNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^\d.]/g, ''));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  function estimateReadingTime(text: string) {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.max(15, Math.round((words / 180) * 60));
  }

  function dedupeStrings(values: string[]) {
    const seen = new Set<string>();
    values.forEach((value) => {
      if (value) seen.add(value);
    });
    return Array.from(seen);
  }

  async function generateProductSummary(
    product: IndexedProduct,
    allProducts: IndexedProduct[]
  ) {
    try {
      const listingsInfo = product.listings
        .map((listing) =>
          `${listing.site}: ${listing.currency} ${listing.price} (${listing.condition}${listing.discountPercent ? `, -${listing.discountPercent}%` : ''})`
        )
        .join('\n');

      const reviewsInfo = product.reviews
        .map((review) => `${review.source} - ${review.sentiment} sentiment`)
        .join('\n');

      const prompt = `Analyze these product listings and provide a brief summary and recommendation.

Product: ${product.mainTitle}
Category: ${product.category}

Listings:
${listingsInfo}

Reviews:
${reviewsInfo || 'No reviews yet'}

Return JSON:
{
  "summary": string,
  "bestDeal": string,
  "recommendation": string
}`;

      const result = await requestAI<{ summary: string; bestDeal: string; recommendation: string }>(
        'ai-product-summary',
        { prompt }
      );

      product.aiSummary = result.summary;
      product.aiRecommendation = result.recommendation;

      const index = allProducts.findIndex((candidate) => candidate.id === product.id);
      if (index >= 0) {
        allProducts[index] = product;
        await chrome.storage.local.set({ indexedProducts: allProducts });
      }
    } catch (error) {
      console.error('[Background] AI summary error:', error);
    }
  }

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url) return;

    const url = tab.url;
    const isYouTube = url.includes('youtube.com/watch');
    const reviewSites = ['cnet.com', 'theverge.com', 'engadget.com', 'tomsguide.com'];
    const isReviewSite = reviewSites.some((site) => url.includes(site));

    if (!isYouTube && !isReviewSite) {
      return;
    }

    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.body?.innerText || '',
      });

      const text = (result?.result as string) || '';
      if (!text) return;

      const reviewData = await requestAI<{
        sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
        reviewerName?: string;
        productName: string;
        keyPoints: string[];
      }>('analyze-review', { text, url });

      const stored = await chrome.storage.local.get('indexedProducts');
      const indexedProducts = (stored.indexedProducts || []) as IndexedProduct[];
      if (!indexedProducts.length) return;

      const matchedProduct = indexedProducts.find((product) =>
        product.mainTitle.toLowerCase().includes(reviewData.productName.toLowerCase()) ||
        reviewData.productName.toLowerCase().includes(product.mainTitle.toLowerCase())
      );

      if (!matchedProduct) {
        return;
      }

      const thumbnail = isYouTube ? `https://img.youtube.com/vi/${extractYouTubeId(url)}/hqdefault.jpg` : undefined;

      if (!matchedProduct.reviews.some((review) => review.url === url)) {
        matchedProduct.reviews.push({
          title: reviewData.reviewerName || (isYouTube ? 'YouTube Review' : 'Review'),
          url,
          source: isYouTube ? 'YouTube' : new URL(url).hostname,
          sentiment: reviewData.sentiment,
          reviewerName: reviewData.reviewerName,
          addedAt: Date.now(),
          thumbnailUrl: thumbnail,
        });
        matchedProduct.lastUpdated = Date.now();

        await chrome.storage.local.set({ indexedProducts });
      }
    } catch (error) {
      console.error('[Background] Review detection error:', error);
    }
  });

  function extractYouTubeId(url: string) {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('v') || '';
    } catch {
      return '';
    }
  }

  if (process.env.NODE_ENV === 'development') {
    (globalThis as Record<string, unknown>).tabbyTest = {
      async clearStorage() {
        await chrome.storage.local.clear();
        console.log('[Test] Storage cleared');
      },
      async logStorage() {
        const data = await chrome.storage.local.get(null);
        console.log('[Test] Storage dump:', data);
      },
      async simulateProductPage() {
        const listing: ProductListing = {
          site: 'amazon.com',
          url: 'https://example.com/product',
          price: 199.99,
          currency: 'USD',
          condition: 'new',
          discountPercent: 5,
          sellerName: 'Example Seller',
          scrapedAt: Date.now(),
          imageUrl: 'https://placehold.co/400x400',
          thumbnailUrl: 'https://placehold.co/200x200',
          availability: 'in-stock',
          shippingInfo: 'Free shipping',
          rating: 4.7,
          reviewCount: 1234,
          priceHistory: [
            { price: 219.99, timestamp: Date.now() - 86400000 },
            { price: 199.99, timestamp: Date.now() },
          ],
        };

        const product: IndexedProduct = {
          id: generateId('test-product'),
          mainTitle: 'Test Product - Example Model',
          category: 'electronics.audio.headphones',
          listings: [listing],
          reviews: [],
          firstSeen: Date.now(),
          lastUpdated: Date.now(),
          primaryImage: listing.imageUrl,
          imageGallery: [listing.imageUrl || ''],
          brand: 'Example Brand',
          specifications: { Battery: '24h' },
          lowestPrice: {
            price: listing.price,
            currency: listing.currency,
            site: listing.site,
            url: listing.url,
          },
          highestPrice: {
            price: listing.price,
            currency: listing.currency,
            site: listing.site,
            url: listing.url,
          },
          averageRating: listing.rating,
          userNotes: '',
          lastViewed: Date.now(),
          viewCount: 1,
          alerts: {},
          comparisonIds: [],
        };

        const stored = await chrome.storage.local.get('indexedProducts');
        const products = (stored.indexedProducts || []) as IndexedProduct[];
        products.push(product);
        await chrome.storage.local.set({ indexedProducts: products, currentProduct: product });
        console.log('[Test] Simulated product added');
      },
      async getStats() {
        const data = await chrome.storage.local.get(null);
        return {
          categories: Object.keys((data.siteCategories || {}) as Record<string, unknown>).length,
          activityLogs: ((data.activityLog || []) as unknown[]).length,
          products: ((data.indexedProducts || []) as unknown[]).length,
          cartItems: ((data.cartItems || []) as unknown[]).length,
        };
      },
    };
    console.log('[Test] Utilities available: tabbyTest.clearStorage(), tabbyTest.logStorage(), tabbyTest.simulateProductPage(), tabbyTest.getStats()');
  }
});