/// <reference lib="es2015" />
/// <reference lib="dom" />
// Content scanner for extracting page and product data

export interface PageMetadata {
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogTitle?: string;
  canonical?: string;
  brand?: string;
}

export interface EnhancedProductData {
  primaryImage?: string;
  imageGallery: string[];
  brand?: string;
  rating?: number;
  reviewCount?: number;
  availability: 'in-stock' | 'out-of-stock' | 'pre-order' | 'unknown';
  shippingInfo?: string;
  specifications: Record<string, string>;
  favicon?: string;
  structuredProduct?: unknown;
  offers?: Array<Record<string, unknown>>;
}

export interface PageData {
  url: string;
  title: string;
  content: string;
  headings: string[];
  images: string[];
  timestamp: number;
  html: string;
  metadata: PageMetadata;
  favicon?: string;
  structuredData: unknown[];
  productData: EnhancedProductData | null;
}

export function scanPageContent(): PageData {
  const url = window.location.href;
  const title = document.title;
  const textContent = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
  const content = textContent.slice(0, 10000);

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((h) => h.textContent?.trim())
    .filter(Boolean) as string[];

  const images = collectImages();
  const metadata = collectMetadata();
  const favicon = resolveUrl(
    document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.getAttribute('href') || ''
  );
  const structuredData = collectStructuredData();
  const productData = scrapeEnhancedProductData(structuredData, metadata, favicon);

  return {
    url,
    title,
    content,
    headings,
    images,
    timestamp: Date.now(),
    html: document.documentElement?.outerHTML?.slice(0, 50000) || '',
    metadata,
    favicon,
    structuredData,
    productData,
  };
}

export function scrapeEnhancedProductData(
  structured: unknown[],
  metadata: PageMetadata,
  favicon?: string
): EnhancedProductData | null {
  const productNode = findProductNode(structured);
  const primaryImage = resolveImage(
    productNode?.image,
    metadata.ogImage ||
      getAttributeValue('[data-testid="product-image"]', 'src') ||
      getAttributeValue('.product-image img', 'src')
  );

  const gallery = normalizeImages([
    ...(Array.isArray(productNode?.image) ? (productNode?.image as string[]) : []),
    ...(collectGalleryImages()),
  ]);

  const brand = extractBrand(productNode, metadata);
  const rating = extractNumber(productNode?.aggregateRating?.ratingValue) ||
    extractNumber(getTextContent('[itemprop="ratingValue"], .ratingValue'));
  const reviewCount = extractNumber(productNode?.aggregateRating?.reviewCount) ||
    extractNumber(getTextContent('[itemprop="reviewCount"], .reviewCount'));
  const availability = normalizeAvailability(
    productNode?.offers?.availability ||
      getPresenceSelector('.in-stock', '.out-of-stock', '.preorder')
  );
  const shippingInfo = getTextContent('[data-testid="shipping-info"], .shipping-message, .shipping-info');
  const specifications = extractSpecs();
  const offers = Array.isArray(productNode?.offers)
    ? (productNode?.offers as Array<Record<string, unknown>>)
    : productNode?.offers
      ? [productNode?.offers as Record<string, unknown>]
      : [];

  const hasMeaningfulData = Boolean(primaryImage || brand || specifications || offers.length);
  if (!hasMeaningfulData) {
    return null;
  }

  return {
    primaryImage,
    imageGallery: gallery,
    brand,
    rating,
    reviewCount,
    availability,
    shippingInfo: shippingInfo || undefined,
    specifications,
    favicon,
    structuredProduct: productNode || undefined,
    offers,
  };
}

// Calculate similarity between two strings
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Normalize title for matching
export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function collectImages(): string[] {
  const candidates = new Set<string>();

  document.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || img.getAttribute('data-src');
    const resolved = resolveImage(src);
    if (resolved && !resolved.startsWith('data:')) {
      candidates.add(resolved);
    }
  });

  return Array.from(candidates).slice(0, 10);
}

function collectGalleryImages(): string[] {
  const selectors = [
    '.product-gallery img',
    '.image-thumbnail img',
    '.thumbnail img',
    '[data-gallery-image]'
  ];

  const gallery = new Set<string>();
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((img) => {
      const src = (img as HTMLImageElement).getAttribute('src') || (img as HTMLImageElement).dataset.src;
      const resolved = resolveImage(src);
      if (resolved) {
        gallery.add(resolved);
      }
    });
  });

  return Array.from(gallery);
}

function collectMetadata(): PageMetadata {
  const getMeta = (name: string, attr = 'content') =>
    document.querySelector(`meta[name="${name}"]`)?.getAttribute(attr) ||
    document.querySelector(`meta[property="${name}"]`)?.getAttribute(attr) || undefined;

  const metadata: PageMetadata = {
    description: getMeta('description'),
    keywords: getMeta('keywords'),
    ogImage: resolveImage(getMeta('og:image')),
    ogTitle: getMeta('og:title'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || undefined,
  };

  const brand = document.querySelector('[itemprop="brand"], .product-brand, [data-testid="brand-name"]')?.textContent;
  if (brand) {
    metadata.brand = brand.trim();
  }

  return metadata;
}

function collectStructuredData(): unknown[] {
  const data: unknown[] = [];

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const json = script.textContent ? JSON.parse(script.textContent) : null;
      if (json) {
        data.push(json);
      }
    } catch (error) {
      console.warn('[ContentScanner] Failed to parse JSON-LD', error);
    }
  });

  return data;
}

function findProductNode(structured: unknown[]): any {
  const nodes: unknown[] = [];

  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object') {
      nodes.push(value);
    }
  };

  structured.forEach(walk);
  return nodes.find((node: any) => {
    const type = node?.['@type'];
    if (!type) return false;
    if (Array.isArray(type)) {
      return type.some((entry) => typeof entry === 'string' && entry.toLowerCase() === 'product');
    }
    if (typeof type === 'string') {
      return type.toLowerCase() === 'product';
    }
    return false;
  }) as Record<string, unknown> | undefined;
}

function extractBrand(productNode: any, metadata: PageMetadata): string | undefined {
  const brandNode = productNode?.brand;
  if (typeof brandNode === 'string') {
    return brandNode;
  }
  if (brandNode && typeof brandNode === 'object' && 'name' in brandNode) {
    return (brandNode as { name?: string }).name;
  }
  return metadata.brand;
}

function extractNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeAvailability(value: unknown): 'in-stock' | 'out-of-stock' | 'pre-order' | 'unknown' {
  if (typeof value !== 'string') {
    return 'unknown';
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('instock')) return 'in-stock';
  if (normalized.includes('preorder') || normalized.includes('pre-order')) return 'pre-order';
  if (normalized.includes('outofstock') || normalized.includes('out of stock')) return 'out-of-stock';
  if (normalized.includes('available')) return 'in-stock';
  return 'unknown';
}

function getPresenceSelector(...selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return selector.includes('out-of-stock') ? 'out-of-stock' : selector.includes('pre') ? 'pre-order' : 'in-stock';
    }
  }
  return undefined;
}

function getTextContent(selector: string): string {
  return (
    document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() || ''
  );
}

function getAttributeValue(selector: string, attribute: string): string {
  return document.querySelector(selector)?.getAttribute(attribute) || '';
}

function normalizeImages(images: string[]): string[] {
  const unique = new Set<string>();
  images.forEach((img) => {
    const resolved = resolveImage(img);
    if (resolved) {
      unique.add(resolved);
    }
  });
  return Array.from(unique);
}

function resolveUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return undefined;
  }
}

function resolveImage(...sources: Array<string | string[] | undefined>): string | undefined {
  for (const source of sources) {
    if (Array.isArray(source)) {
      const resolvedArray = resolveImage(...source);
      if (resolvedArray) return resolvedArray;
      continue;
    }
    const resolved = resolveUrl(typeof source === 'string' ? source : undefined);
    if (resolved) {
      return resolved;
    }
  }
  return undefined;
}

function extractSpecs(): Record<string, string> {
  const specs: Record<string, string> = {};
  const selectors = [
    '.specs-table tr',
    '.product-specs li',
    '[itemprop="additionalProperty"]',
    '.product-specs-table tr',
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((row) => {
      const label =
        row.querySelector('.spec-label, .label, th, [itemprop="name"]')?.textContent?.trim() ||
        row.querySelector('dt')?.textContent?.trim();
      const value =
        row.querySelector('.spec-value, .value, td, [itemprop="value"]')?.textContent?.trim() ||
        row.querySelector('dd')?.textContent?.trim();

      if (label && value) {
        specs[label.replace(/:\s*$/, '')] = value;
      }
    });
  });

  return specs;
}
