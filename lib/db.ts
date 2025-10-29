const DB_NAME = "tabby_shopping";
const DB_VERSION = 3; // Upgraded for new schema
const PRODUCTS_STORE = 'products';
const VISITS_STORE = 'product_visits';
const SITE_VISITS_STORE = 'site_visits'; // Track all site visits
const SITE_PRODUCTS_STORE = 'site_products'; // Track products per site with metadata

interface Product {
  id?: number;
  title: string;
  normalizedTitle: string;
  category: string[]; // Max 3 levels: e.g., ["Electronics", "Audio", "Headphones"]
  brand?: string;
  firstSeen: number;
  lastSeen: number;
  viewCount: number;
  siteCount: number; // How many different sites we've seen this on
}

interface SiteProduct {
  id?: number;
  productId: number; // Links to canonical product
  site: string;
  url: string;
  title: string; // Site-specific title
  price: number;
  currency: string;
  imageUrl?: string;
  imageHash?: string; // For duplicate detection
  specs?: string[];
  firstSeen: number;
  lastSeen: number;
  priceHistory: { price: number; timestamp: number }[];
}

interface SiteVisit {
  id?: number;
  url: string;
  site: string;
  domain: string;
  title: string;
  tags: string[]; // Auto-generated tags describing the visit
  searchableDescription?: string; // AI-generated searchable description
  isProductPage: boolean;
  productId?: number; // If it's a product page
  timestamp: number;
  duration?: number; // Time spent on page (if available)
}

class TabbyDB {
  private db: IDBDatabase | null = null;

  async init() {
    console.log('tabby-test: Initializing database v3');
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("tabby-test: DB init failed:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("tabby-test: DB initialized successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('tabby-test: DB upgrade needed, creating stores');

        // Products store - canonical product data (deduplicated across sites)
        if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
          const productStore = db.createObjectStore(PRODUCTS_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          productStore.createIndex('normalizedTitle', 'normalizedTitle', { unique: false });
          productStore.createIndex('category', 'category', { unique: false, multiEntry: true });
          productStore.createIndex('brand', 'brand', { unique: false });
          productStore.createIndex('firstSeen', 'firstSeen', { unique: false });
          productStore.createIndex('viewCount', 'viewCount', { unique: false });
        }

        // Site-specific product data (same product can exist on multiple sites)
        if (!db.objectStoreNames.contains(SITE_PRODUCTS_STORE)) {
          const siteProductStore = db.createObjectStore(SITE_PRODUCTS_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          siteProductStore.createIndex('productId', 'productId', { unique: false });
          siteProductStore.createIndex('site', 'site', { unique: false });
          siteProductStore.createIndex('url', 'url', { unique: true }); // Same URL = same product
          siteProductStore.createIndex('imageHash', 'imageHash', { unique: false });
          siteProductStore.createIndex('site_product', ['site', 'productId'], { unique: false });
        }

        // All site visits (product pages and regular pages)
        if (!db.objectStoreNames.contains(SITE_VISITS_STORE)) {
          const siteVisitStore = db.createObjectStore(SITE_VISITS_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
          siteVisitStore.createIndex('site', 'site', { unique: false });
          siteVisitStore.createIndex('domain', 'domain', { unique: false });
          siteVisitStore.createIndex('timestamp', 'timestamp', { unique: false });
          siteVisitStore.createIndex('isProductPage', 'isProductPage', { unique: false });
          siteVisitStore.createIndex('productId', 'productId', { unique: false });
          siteVisitStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // Legacy product_visits store - keep for backward compatibility
        if (!db.objectStoreNames.contains(VISITS_STORE)) {
          const visitStore = db.createObjectStore(VISITS_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          visitStore.createIndex('productId', 'productId', { unique: false });
          visitStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Add or update a canonical product
  async addProduct(product: any) {
    const db = await this.getDB();

    console.log("tabby-test: Adding canonical product:", product.title);

    const productData: Product = {
      title: product.title,
      normalizedTitle: product.normalizedTitle,
      category: this.normalizeCategory(product.category),
      brand: product.brand,
      firstSeen: product.firstSeen || Date.now(),
      lastSeen: Date.now(),
      viewCount: 1,
      siteCount: 1,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], "readwrite");
      const store = tx.objectStore(PRODUCTS_STORE);
      const request = store.add(productData);

      request.onsuccess = () => {
        console.log("tabby-test: Product added with ID:", request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update existing product
  async updateProduct(id: number, updates: Partial<Product>) {
    const db = await this.getDB();

    return new Promise(async (resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], "readwrite");
      const store = tx.objectStore(PRODUCTS_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const product = getRequest.result;
        if (!product) {
          reject(new Error("Product not found"));
          return;
        }

        const updated = { ...product, ...updates, lastSeen: Date.now() };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => {
          console.log("tabby-test: Product updated:", id);
          resolve(putRequest.result);
        };
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Add site-specific product (with duplicate detection)
  async addSiteProduct(siteProduct: any) {
    const db = await this.getDB();

    console.log("tabby-test: Adding site product for", siteProduct.site);

    // Check if this exact URL already exists
    const existing = await this.getSiteProductByUrl(siteProduct.url);
    if (existing) {
      console.log(
        "tabby-test: Site product already exists, updating price history",
      );
      // Update existing with new price
      await this.updateSiteProduct(existing.id!, {
        price: siteProduct.price,
        lastSeen: Date.now(),
        priceHistory: [
          ...(existing.priceHistory || []),
          { price: siteProduct.price, timestamp: Date.now() },
        ].slice(-30), // Keep last 30 price points
      });
      return existing.id;
    }

    // Check for duplicate on same site using image hash
    if (siteProduct.imageHash) {
      const duplicate = await this.findDuplicateBySiteAndImage(
        siteProduct.site,
        siteProduct.imageHash,
        siteProduct.productId,
      );

      if (duplicate) {
        console.log("tabby-test: Duplicate detected via image hash, skipping");
        return duplicate.id;
      }
    }

    const siteProductData: SiteProduct = {
      productId: siteProduct.productId,
      site: siteProduct.site,
      url: siteProduct.url,
      title: siteProduct.title,
      price: siteProduct.price,
      currency: siteProduct.currency,
      imageUrl: siteProduct.imageUrl,
      imageHash: siteProduct.imageHash,
      specs: siteProduct.specs,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      priceHistory: [{ price: siteProduct.price, timestamp: Date.now() }],
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_PRODUCTS_STORE], "readwrite");
      const store = tx.objectStore(SITE_PRODUCTS_STORE);
      const request = store.add(siteProductData);

      request.onsuccess = () => {
        console.log("tabby-test: Site product added with ID:", request.result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Update site product
  async updateSiteProduct(id: number, updates: Partial<SiteProduct>) {
    const db = await this.getDB();

    return new Promise(async (resolve, reject) => {
      const tx = db.transaction([SITE_PRODUCTS_STORE], "readwrite");
      const store = tx.objectStore(SITE_PRODUCTS_STORE);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const siteProduct = getRequest.result;
        if (!siteProduct) {
          reject(new Error("Site product not found"));
          return;
        }

        const updated = { ...siteProduct, ...updates, lastSeen: Date.now() };
        const putRequest = store.put(updated);

        putRequest.onsuccess = () => resolve(putRequest.result);
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Track site visit with auto-generated tags
  async addSiteVisit(visit: {
    url: string;
    site: string;
    title: string;
    isProductPage: boolean;
    productId?: number;
    metadata?: any;
  }) {
    const db = await this.getDB();

    const domain = new URL(visit.url).hostname;
    const tags = this.generateTags(visit);

    console.log("tabby-test: Recording site visit:", visit.site, "tags:", tags);

    const siteVisit: SiteVisit = {
      url: visit.url,
      site: visit.site,
      domain,
      title: visit.title,
      tags,
      searchableDescription: visit.metadata?.searchableDescription, // AI-generated description
      isProductPage: visit.isProductPage,
      productId: visit.productId,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_VISITS_STORE], "readwrite");
      const store = tx.objectStore(SITE_VISITS_STORE);
      const request = store.add(siteVisit);

      request.onsuccess = () => {
        console.log("tabby-test: Site visit recorded with ID:", request.result);
        if (visit.metadata?.searchableDescription) {
          console.log(
            "tabby-test: Searchable description saved:",
            visit.metadata.searchableDescription.slice(0, 100),
          );
        }
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addVisit(visit: any) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([VISITS_STORE], "readwrite");
      const store = tx.objectStore(VISITS_STORE);
      const request = store.add(visit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Helper: Normalize category to max 3 levels
  private normalizeCategory(category: any): string[] {
    if (!category) return ["Uncategorized"];

    const arr = Array.isArray(category) ? category : [category];
    const cleaned = arr
      .filter((c) => c && typeof c === "string")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .slice(0, 3); // Max 3 levels

    return cleaned.length > 0 ? cleaned : ["Uncategorized"];
  }

  // Helper: Generate tags for site visit (enhanced with metadata)
  private generateTags(visit: {
    url: string;
    site: string;
    title: string;
    isProductPage: boolean;
    metadata?: any;
  }): string[] {
    const tags: string[] = [];

    console.log("tabby-test: Generating tags for:", visit.site);

    // Add site name
    tags.push(visit.site);

    // Add page type
    if (visit.isProductPage) {
      tags.push("product-page");
      tags.push("shopping");
    }

    // Process metadata if available
    if (visit.metadata) {
      // AI-generated tags (highest priority - most accurate!)
      if (visit.metadata.aiTags && Array.isArray(visit.metadata.aiTags)) {
        console.log(
          "tabby-test: Using AI-generated tags:",
          visit.metadata.aiTags,
        );
        tags.push(...visit.metadata.aiTags.map((t: string) => `ai-${t}`));
      }

      // Keywords from meta tags
      if (visit.metadata.keywords) {
        const keywords = visit.metadata.keywords
          .split(",")
          .map((k: string) => k.trim().toLowerCase())
          .filter((k: string) => k.length > 2 && k.length < 20);
        tags.push(...keywords.slice(0, 10)); // Max 10 keywords
      }

      // Description-based tags
      if (visit.metadata.description) {
        const desc = visit.metadata.description.toLowerCase();
        this.extractSemanticTags(desc, tags);
      }

      // AI Summary-based tags
      if (visit.metadata.aiSummary) {
        console.log("tabby-test: Using AI summary for tag extraction");
        this.extractSemanticTags(visit.metadata.aiSummary.toLowerCase(), tags);
      }

      // OpenGraph type
      if (visit.metadata.ogType) {
        tags.push(`og-${visit.metadata.ogType}`);
      }

      // Site category from meta
      if (visit.metadata.category) {
        tags.push(visit.metadata.category.toLowerCase());
      }

      // Navigation/header links
      if (visit.metadata.navLinks) {
        visit.metadata.navLinks.forEach((link: string) => {
          const cleaned = link.toLowerCase().trim();
          if (cleaned.length > 2 && cleaned.length < 20) {
            tags.push(`nav-${cleaned}`);
          }
        });
      }

      // Schema.org data
      if (visit.metadata.schemaTypes) {
        visit.metadata.schemaTypes.forEach((type: string) => {
          tags.push(`schema-${type.toLowerCase()}`);
        });
      }
    }

    // Extract tags from URL
    const urlParts = visit.url
      .toLowerCase()
      .split("/")
      .filter((p) => p.length > 0);
    for (const part of urlParts) {
      if (part.includes("product")) tags.push("product");
      if (part.includes("category") || part.includes("categories"))
        tags.push("browsing");
      if (part.includes("search")) tags.push("search");
      if (part.includes("deals") || part.includes("sale")) tags.push("deals");
      if (part.includes("blog") || part.includes("article"))
        tags.push("content");
      if (part.includes("portfolio")) tags.push("portfolio");
    }

    // Extract category hints from title
    const titleLower = visit.title.toLowerCase();
    this.extractSemanticTags(titleLower, tags);

    // Day of week for activity patterns
    const day = new Date()
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    tags.push(`day-${day}`);

    // Hour of day for time-based patterns
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) tags.push("time-night");
    else if (hour >= 6 && hour < 12) tags.push("time-morning");
    else if (hour >= 12 && hour < 18) tags.push("time-afternoon");
    else tags.push("time-evening");

    // Clean and deduplicate
    const cleaned = tags
      .map((t) => t.replace(/[^\w-]/g, "").toLowerCase())
      .filter((t) => t.length > 1)
      .filter((t) => !this.isStopWord(t));

    const unique = [...new Set(cleaned)];

    console.log(
      "tabby-test: Generated",
      unique.length,
      "tags (including AI tags):",
      unique,
    );
    return unique;
  }

  // Extract semantic tags from text
  private extractSemanticTags(text: string, tags: string[]): void {
    // Technology & Development
    if (/\b(design|ui|ux|creative|designer)\b/.test(text)) tags.push("design");
    if (/\b(code|programming|developer|software|dev)\b/.test(text))
      tags.push("development");
    if (/\b(web|website|frontend|backend)\b/.test(text)) tags.push("web");
    if (/\b(mobile|ios|android|app)\b/.test(text)) tags.push("mobile");
    if (/\b(ai|artificial intelligence|machine learning|ml)\b/.test(text))
      tags.push("ai");

    // Creative
    if (/\b(art|artwork|illustration|graphic)\b/.test(text)) tags.push("art");
    if (/\b(photo|photography|image|picture)\b/.test(text))
      tags.push("photography");
    if (/\b(video|film|cinema|movie)\b/.test(text)) tags.push("video");
    if (/\b(music|audio|sound|podcast)\b/.test(text)) tags.push("audio");
    if (/\b(animation|motion|3d)\b/.test(text)) tags.push("animation");

    // Shopping & Products
    if (/\b(shop|store|buy|purchase|cart|checkout)\b/.test(text))
      tags.push("shopping");
    if (/\b(electronics?|tech|gadget)\b/.test(text)) tags.push("electronics");
    if (/\b(fashion|clothing|apparel|wear)\b/.test(text)) tags.push("fashion");
    if (/\b(food|restaurant|recipe|cooking)\b/.test(text)) tags.push("food");
    if (/\b(book|ebook|reading|literature)\b/.test(text)) tags.push("books");
    if (/\b(game|gaming|esports|gamer)\b/.test(text)) tags.push("gaming");

    // Electronics subcategories
    if (/\b(headphone|earbuds|speakers|audio)\b/.test(text))
      tags.push("audio-equipment");
    if (/\b(laptop|computer|pc|desktop)\b/.test(text)) tags.push("computers");
    if (/\b(camera|lens|photography)\b/.test(text))
      tags.push("camera-equipment");
    if (/\b(phone|smartphone|mobile)\b/.test(text)) tags.push("smartphones");
    if (/\b(watch|smartwatch|wearable)\b/.test(text)) tags.push("wearables");
    if (/\b(tv|television|monitor|display)\b/.test(text)) tags.push("displays");
    if (/\b(tablet|ipad)\b/.test(text)) tags.push("tablets");

    // Content types
    if (/\b(news|article|blog|post)\b/.test(text)) tags.push("news");
    if (/\b(tutorial|guide|how-to|learn)\b/.test(text))
      tags.push("educational");
    if (/\b(review|rating|comparison)\b/.test(text)) tags.push("reviews");
    if (/\b(deal|sale|discount|offer|promo)\b/.test(text)) tags.push("deals");

    // Business & Professional
    if (/\b(business|enterprise|corporate)\b/.test(text)) tags.push("business");
    if (/\b(finance|banking|investment|stock)\b/.test(text))
      tags.push("finance");
    if (/\b(job|career|hiring|employment)\b/.test(text)) tags.push("careers");
    if (/\b(education|learning|course|training)\b/.test(text))
      tags.push("education");

    // Social & Community
    if (/\b(social|community|forum|discussion)\b/.test(text))
      tags.push("social");
    if (/\b(portfolio|showcase|work|project)\b/.test(text))
      tags.push("portfolio");
  }

  // Stop words to filter out
  private isStopWord(word: string): boolean {
    const stopWords = [
      "the",
      "and",
      "for",
      "with",
      "from",
      "your",
      "this",
      "that",
      "are",
      "was",
      "were",
      "been",
      "have",
      "has",
      "had",
      "will",
      "would",
      "could",
      "should",
      "may",
      "might",
      "can",
      "www",
      "com",
      "http",
      "https",
      "html",
      "php",
      "aspx",
      "jsp",
    ];
    return stopWords.includes(word);
  }

  // Helper: Get site product by URL
  private async getSiteProductByUrl(url: string): Promise<SiteProduct | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(SITE_PRODUCTS_STORE);
      const index = store.index("url");
      const request = index.get(url);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Helper: Find duplicate product on same site by image hash
  private async findDuplicateBySiteAndImage(
    site: string,
    imageHash: string,
    excludeProductId?: number,
  ): Promise<SiteProduct | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(SITE_PRODUCTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result as SiteProduct[];
        const match = results.find(
          (sp) =>
            sp.site === site &&
            sp.imageHash === imageHash &&
            sp.productId !== excludeProductId, // Allow same product on different sites
        );
        resolve(match || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Helper: Calculate simple image hash (for duplicate detection)
  async hashImage(imageUrl: string): Promise<string | null> {
    try {
      // Simple hash based on URL structure and filename
      const url = new URL(imageUrl);
      const filename = url.pathname.split("/").pop() || "";
      const hash = filename.split(".")[0]; // Use filename without extension
      return hash.toLowerCase();
    } catch {
      return null;
    }
  }

  async getAllProducts() {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(PRODUCTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProductById(id: number): Promise<Product | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(PRODUCTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getSiteProductsByProductId(productId: number): Promise<SiteProduct[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(SITE_PRODUCTS_STORE);
      const index = store.index("productId");
      const request = index.getAll(productId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getProductVisits(productId: number) {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([VISITS_STORE], "readonly");
      const store = tx.objectStore(VISITS_STORE);
      const index = store.index("productId");
      const request = index.getAll(productId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ANALYTICS: Get weekly activity summary
  async getWeeklyAnalytics() {
    const db = await this.getDB();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    console.log("tabby-test: Generating weekly analytics");

    return new Promise<any>(async (resolve, reject) => {
      const tx = db.transaction(
        [SITE_VISITS_STORE, PRODUCTS_STORE],
        "readonly",
      );
      const visitsStore = tx.objectStore(SITE_VISITS_STORE);
      const productsStore = tx.objectStore(PRODUCTS_STORE);

      const visitsRequest = visitsStore.getAll();
      const productsRequest = productsStore.getAll();

      Promise.all([
        new Promise((res, rej) => {
          visitsRequest.onsuccess = () => res(visitsRequest.result);
          visitsRequest.onerror = () => rej(visitsRequest.error);
        }),
        new Promise((res, rej) => {
          productsRequest.onsuccess = () => res(productsRequest.result);
          productsRequest.onerror = () => rej(productsRequest.error);
        }),
      ])
        .then(([visits, products]) => {
          const weeklyVisits = (visits as SiteVisit[]).filter(
            (v) => v.timestamp >= weekAgo,
          );

          // Site breakdown
          const siteBreakdown = new Map<string, number>();
          weeklyVisits.forEach((v) => {
            siteBreakdown.set(v.site, (siteBreakdown.get(v.site) || 0) + 1);
          });

          // Tag breakdown
          const tagBreakdown = new Map<string, number>();
          weeklyVisits.forEach((v) => {
            v.tags?.forEach((tag: string) => {
              tagBreakdown.set(tag, (tagBreakdown.get(tag) || 0) + 1);
            });
          });

          // Day of week pattern
          const dayPattern = new Map<string, number>();
          ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].forEach((day) => {
            const count = weeklyVisits.filter((v) =>
              v.tags?.includes(`day-${day}`),
            ).length;
            dayPattern.set(day, count);
          });

          // Category breakdown (from products)
          const categoryBreakdown = new Map<string, number>();
          (products as Product[]).forEach((p: Product) => {
            if (p.category && p.category.length > 0) {
              const topCategory = p.category[0];
              categoryBreakdown.set(
                topCategory,
                (categoryBreakdown.get(topCategory) || 0) + 1,
              );
            }
          });

          const productsList = products as Product[];

          const analytics = {
            period: "Last 7 days",
            totalVisits: weeklyVisits.length,
            productPageVisits: weeklyVisits.filter((v) => v.isProductPage)
              .length,
            uniqueSites: new Set(weeklyVisits.map((v) => v.site)).size,
            totalProductsTracked: productsList.length,

            topSites: Array.from(siteBreakdown.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([site, count]) => ({ site, visits: count })),

            topTags: Array.from(tagBreakdown.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 15)
              .map(([tag, count]) => ({ tag, count })),

            dayOfWeekPattern: Array.from(dayPattern.entries()).map(
              ([day, count]) => ({ day, visits: count }),
            ),

            topCategories: Array.from(categoryBreakdown.entries())
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([category, count]) => ({ category, products: count })),

            mostViewedProducts: productsList
              .sort(
                (a: Product, b: Product) =>
                  (b.viewCount || 0) - (a.viewCount || 0),
              )
              .slice(0, 10)
              .map((p: Product) => ({
                id: p.id,
                title: p.title,
                category: p.category,
                viewCount: p.viewCount,
                siteCount: p.siteCount,
              })),
          };

          console.log("tabby-test: Weekly analytics generated:", analytics);
          resolve(analytics);
        })
        .catch(reject);
    });
  }

  // Get all site visits within a date range
  async getSiteVisits(
    startDate?: number,
    endDate?: number,
  ): Promise<SiteVisit[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_VISITS_STORE], "readonly");
      const store = tx.objectStore(SITE_VISITS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as SiteVisit[];

        if (startDate) {
          results = results.filter((v) => v.timestamp >= startDate);
        }
        if (endDate) {
          results = results.filter((v) => v.timestamp <= endDate);
        }

        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([PRODUCTS_STORE], "readonly");
      const store = tx.objectStore(PRODUCTS_STORE);
      const index = store.index("category");
      const request = index.getAll(category);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Search site visits using natural language (e.g., "last week I saw a beautiful blue theme saas dashboard")
  async searchSiteVisits(
    query: string,
    options?: {
      since?: number; // Timestamp to search from
      limit?: number;
    },
  ): Promise<SiteVisit[]> {
    const db = await this.getDB();
    const since = options?.since || Date.now() - 30 * 24 * 60 * 60 * 1000; // Default: last 30 days
    const limit = options?.limit || 50;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SITE_VISITS_STORE], "readonly");
      const store = tx.objectStore(SITE_VISITS_STORE);
      const index = store.index("by_timestamp");
      const range = IDBKeyRange.lowerBound(since);
      const request = index.openCursor(range, "prev"); // Newest first

      const results: Array<{ visit: SiteVisit; score: number }> = [];
      const queryTerms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((term) => term.length > 2);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const visit = cursor.value as SiteVisit;

          // Score based on matches in searchableDescription, tags, title, and URL
          let score = 0;
          const searchText = [
            visit.searchableDescription || "",
            visit.tags.join(" "),
            visit.title,
            visit.url,
          ]
            .join(" ")
            .toLowerCase();

          queryTerms.forEach((term) => {
            const matches = (searchText.match(new RegExp(term, "gi")) || [])
              .length;
            score += matches;

            // Boost score for tag matches (tags are AI-generated and highly relevant)
            if (visit.tags.some((tag) => tag.toLowerCase().includes(term))) {
              score += 3;
            }

            // Boost score for searchableDescription matches (AI-generated natural language)
            if (visit.searchableDescription?.toLowerCase().includes(term)) {
              score += 2;
            }
          });

          if (score > 0) {
            results.push({ visit, score });
          }

          cursor.continue();
        } else {
          // Sort by score descending, then by timestamp
          results.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.visit.timestamp - a.visit.timestamp;
          });

          const topResults = results.slice(0, limit).map((r) => r.visit);
          console.log(
            "tabby-test: Search results for:",
            query,
            "found:",
            topResults.length,
          );
          resolve(topResults);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init();
    return this.db!;
  }
}

export const db = new TabbyDB();
