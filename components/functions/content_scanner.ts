// Content scanner for extracting page data
import { ProductCondition } from "../types/enums";
import type { ExtractedPageData } from "../types/db";

export type PageData = ExtractedPageData;

const SOCIAL_MEDIA_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "snapchat.com",
  "pinterest.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "discord.com",
  "threads.net",
];

function normalizeUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const absoluteUrl = new URL(src, window.location.href).href;
    if (absoluteUrl.startsWith("data:")) return null;
    return absoluteUrl;
  } catch {
    return null;
  }
}

function getImageArea(img: HTMLImageElement): number {
  const rect = img.getBoundingClientRect();
  const renderedArea = Math.round(rect.width) * Math.round(rect.height);
  if (renderedArea > 0) {
    return renderedArea;
  }
  const naturalArea = (img.naturalWidth || 0) * (img.naturalHeight || 0);
  return naturalArea;
}

function collectPrimaryImages(): string[] {
  const candidates = Array.from(
    document.querySelectorAll<HTMLImageElement>("img[src]")
  )
    .map((img) => {
      const normalized = normalizeUrl(img.currentSrc || img.src);
      if (!normalized) return null;

      const style = window.getComputedStyle(img);
      const hidden =
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0";

      const area = getImageArea(img);

      if (!area || area <= 0) return null;

      return {
        src: normalized,
        area,
        isVisible: !hidden,
      };
    })
    .filter(Boolean) as Array<{
    src: string;
    area: number;
    isVisible: boolean;
  }>;

  candidates.sort((a, b) => {
    if (a.isVisible !== b.isVisible) {
      return a.isVisible ? -1 : 1;
    }
    return b.area - a.area;
  });

  for (const candidate of candidates) {
    if (candidate.isVisible) {
      return [candidate.src];
    }
  }

  // Fallback: try meta tags if no visible images found
  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:url"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="og:image"]',
    'meta[name="og:image:url"]',
    'meta[name="twitter:image"]',
    'meta[name="twitter:image:src"]',
    'link[rel="image_src"]',
  ];

  for (const selector of metaSelectors) {
    const element = document.querySelector<HTMLMetaElement | HTMLLinkElement>(
      selector
    );
    const content =
      element instanceof HTMLLinkElement
        ? element.href
        : element?.content ?? null;
    const normalized = normalizeUrl(content);
    if (normalized) {
      return [normalized];
    }
  }

  return [];
}

export function isSocialMediaUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return SOCIAL_MEDIA_DOMAINS.some((domain) => {
      return (
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    });
  } catch {
    return false;
  }
}

function sanitizeTextContent(rawText: string): string {
  const withoutLinks = rawText.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "");
  return withoutLinks.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

async function generateAISummary(title: string, content: string): Promise<{
  summary?: string;
  tags?: string[];
  is_product?: boolean;
  product_price?: string;
  product_discount?: string;
  product_condition?: "new" | "refurbished" | "used" | "unknown";
  product_summary?: string;
  product_pros?: string[];
  product_cons?: string[];
}> {
  try {
    // Check if LanguageModel is available
    if (typeof LanguageModel === "undefined") {
      return {};
    }

    const availability = await LanguageModel.availability();
    if (availability.available === "no") {
      return {};
    }

    // Create a session for analysis
    const session = await LanguageModel.create({
      temperature: 0.5,
      topK: 3,
    });

    // Define JSON Schema for structured output
    const schema = {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "A 2-3 sentence summary describing what content/features the website has"
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "3-5 tags about the main aspects of the page"
        },
        is_product: {
          type: "boolean",
          description: "Whether this page is an ecommerce product page"
        },
        product_price: {
          type: "string",
          description: "The product price if this is a product page, otherwise null"
        },
        product_discount: {
          type: "string",
          description: "The discount percentage or amount if available, otherwise null"
        },
        product_condition: {
          type: "string",
          enum: ["new", "refurbished", "used", "unknown"],
          description: "The condition of the product: new, refurbished, used, or unknown if this is a product page"
        },
        product_summary: {
          type: "string",
          description: "A brief summary of the product if this is a product page, otherwise null"
        },
        product_pros: {
          type: "array",
          items: { type: "string" },
          description: "List of product pros/benefits if this is a product page, otherwise null"
        },
        product_cons: {
          type: "array",
          items: { type: "string" },
          description: "List of product cons/drawbacks if this is a product page, otherwise null"
        }
      },
      required: ["summary", "tags", "is_product"]
    };

    const prompt = `Analyze this webpage and provide structured information.

Title: ${title}

Content: ${content.slice(0, 3000)}

Analyze the content and determine:
1. What content/features this website has (summary)
2. Main aspects/topics of the page (tags)
3. Whether this is an ecommerce product page
4. If it's a product: extract price, discount, condition (new/refurbished/used/unknown), summary, pros and cons

Provide your analysis in JSON format.`;

    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });

    session.destroy();

    // Parse the JSON response
    const parsed = JSON.parse(result);
    
    return {
      summary: parsed.summary || undefined,
      tags: parsed.tags || undefined,
      is_product: parsed.is_product || false,
      product_price: parsed.product_price || undefined,
      product_discount: parsed.product_discount || undefined,
      product_condition: (parsed.product_condition as ProductCondition) || undefined,
      product_summary: parsed.product_summary || undefined,
      product_pros: parsed.product_pros || undefined,
      product_cons: parsed.product_cons || undefined,
    };
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    return {};
  }
}

export function scanPageContent(): PageData {
  const url = window.location.href;
  const title = document.title;
  const rawContent = document.body?.innerText ?? "";
  const sanitizedContent = sanitizeTextContent(rawContent).trim();
  const content = sanitizedContent.slice(0, 20000);

  const images = collectPrimaryImages();
  
  return {
    url,
    title,
    content,
    images,
    timestamp: Date.now(),
  };
}

export async function scanPageContentWithAI(): Promise<PageData> {
  const url = window.location.href;
  const title = document.title;
  const rawContent = document.body?.innerText ?? "";
  const sanitizedContent = sanitizeTextContent(rawContent).trim();
  const content = sanitizedContent.slice(0, 5000);
  console.log("Sanitized content for AI analysis:", content);

  const images = collectPrimaryImages();
  
  // Generate AI analysis including product detection
  console.log("Generating AI summary and analysis...");
  const aiData = await generateAISummary(title, content);
console.log("AI analysis result:", aiData);
  return {
    url,
    title,
    content,
    images,
    summary: aiData.summary,
    tags: aiData.tags,
    is_product: aiData.is_product,
    product_price: aiData.product_price,
    product_discount: aiData.product_discount,
    product_condition: aiData.product_condition as ProductCondition | undefined,
    product_summary: aiData.product_summary,
    product_pros: aiData.product_pros,
    product_cons: aiData.product_cons,
    timestamp: Date.now(),
  };
}
