import { storage } from "@wxt-dev/storage";
import { getAISession, isPromptAPIAvailable } from "../../entrypoints/ai/main_ai";
import { SiteCategory } from "../types/enums";
import {
  SiteMeta,
  STORAGE_KEYS,
  STORAGE_LIMITS,
} from "../types/db";

function normalizeDomain(domain: string) {
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
}

const KNOWN_DOMAINS: Record<string, SiteCategory> = {
  // Commerce
  "amazon.com": SiteCategory.ECOMMERCE,
  "www.amazon.com": SiteCategory.ECOMMERCE,
  "ebay.com": SiteCategory.MARKETPLACE,
  "etsy.com": SiteCategory.MARKETPLACE,
  "bestbuy.com": SiteCategory.ECOMMERCE,
  "walmart.com": SiteCategory.ECOMMERCE,

  // Video / streaming
  "youtube.com": SiteCategory.VIDEO,
  "vimeo.com": SiteCategory.VIDEO,
  "twitch.tv": SiteCategory.STREAMING,

  // Social
  "twitter.com": SiteCategory.SOCIAL_MEDIA,
  "x.com": SiteCategory.SOCIAL_MEDIA,
  "facebook.com": SiteCategory.SOCIAL_MEDIA,
  "instagram.com": SiteCategory.SOCIAL_MEDIA,
  "tiktok.com": SiteCategory.SOCIAL_MEDIA,

  // Dev / docs
  "github.com": SiteCategory.DEVELOPMENT,
  "gitlab.com": SiteCategory.DEVELOPMENT,
  "developer.mozilla.org": SiteCategory.DOCUMENTATION,

  // News / blogs
  "medium.com": SiteCategory.BLOG,
  "nytimes.com": SiteCategory.NEWS,
  "cnn.com": SiteCategory.NEWS,
  "bbc.co.uk": SiteCategory.NEWS,

  // Search
  "google.com": SiteCategory.SEARCH_ENGINE,
  "bing.com": SiteCategory.SEARCH_ENGINE,
  "duckduckgo.com": SiteCategory.SEARCH_ENGINE,
};

async function readSiteMetas(): Promise<Record<string, SiteMeta>> {
  const key = (`local:${STORAGE_KEYS.SITE_METAS}` as unknown) as `local:${string}`;
  const cached = (await storage.getItem(key)) as Record<string, SiteMeta> | null;
  return cached || {};
}

async function writeSiteMetas(metas: Record<string, SiteMeta>) {
  const key = (`local:${STORAGE_KEYS.SITE_METAS}` as unknown) as `local:${string}`;
  await storage.setItem(key, metas);
}

export async function categorizeSiteByMetadata(opts: {
  url: string;
  domain?: string;
  title?: string;
  description?: string;
}): Promise<SiteMeta> {
  const domainRaw = opts.domain || opts.url;
  const domain = normalizeDomain(domainRaw);
  
  console.log("[Site Categorizer] Starting categorization");
  console.log("[Site Categorizer] Raw domain:", domainRaw);
  console.log("[Site Categorizer] Normalized domain:", domain);

  const metas = await readSiteMetas();
  console.log("[Site Categorizer] Loaded existing metas:", Object.keys(metas).length, "entries");
  
  const existing = metas[domain];

  const now = Date.now();
  if (existing) {
    const ageDays = (now - existing.last_updated) / (1000 * 60 * 60 * 24);
    console.log("[Site Categorizer] Found cached entry, age:", ageDays.toFixed(1), "days");
    
    if (ageDays < STORAGE_LIMITS.SITE_META_CACHE_DAYS) {
      console.log("[Site Categorizer] Using cached category:", existing.category);
      return existing;
    } else {
      console.log("[Site Categorizer] Cache expired, re-categorizing");
    }
  } else {
    console.log("[Site Categorizer] No cached entry found");
  }

  // Known domain quick path
  const known = KNOWN_DOMAINS[domain];
  if (known) {
    console.log("[Site Categorizer] ✓ Known domain detected:", domain, "→", known);
    
    const meta: SiteMeta = {
      domain,
      category: known,
      display_name: domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      favicon: undefined,
      first_categorized: existing ? existing.first_categorized : now,
      last_updated: now,
      confidence: 100,
    };

    metas[domain] = meta;
    await writeSiteMetas(metas);
    console.log("[Site Categorizer] Saved to storage");
    return meta;
  }

  console.log("[Site Categorizer] Unknown domain, using AI...");
  
  // Fall back to AI classification
  let category = SiteCategory.UNKNOWN;
  let confidence = 0;

  try {
    if (isPromptAPIAvailable && isPromptAPIAvailable()) {
      console.log("[Site Categorizer] AI API is available");
      
      const session = await getAISession();
      if (session) {
        console.log("[Site Categorizer] AI session created");
        
        const choices = Object.values(SiteCategory).map((c) => `- ${c}`).join("\n");
        const prompt = `You are a website categorization assistant. Given the site domain, URL, title, and meta description, choose the single best category from the list below and return only the category token (one of the values exactly):\n\n${choices}\n\nDomain: ${domain}\nURL: ${opts.url}\nTitle: ${opts.title || ""}\nDescription: ${opts.description || ""}\n\nRespond with a single category token (for example: \"ecommerce\").`;

        console.log("[Site Categorizer] Sending prompt to AI...");
        const responseRaw = await session.prompt(prompt, { responseConstraint: undefined });
        const response = (responseRaw || "").trim().toLowerCase();
        
        console.log("[Site Categorizer] AI response:", response);

        // Map response to enum if possible
        const matched = Object.values(SiteCategory).find((v) => v === response);
        if (matched) {
          category = matched;
          confidence = 80;
          console.log("[Site Categorizer] ✓ Exact match found:", category);
        } else {
          // Try to extract token from longer response
          const token = response.split(/\s|[:\n]/).find((t) => Object.values(SiteCategory).includes(t as SiteCategory));
          if (token) {
            category = token as SiteCategory;
            confidence = 70;
            console.log("[Site Categorizer] ✓ Token extracted:", category);
          } else {
            console.log("[Site Categorizer] ✗ No valid category found in response");
          }
        }
      } else {
        console.log("[Site Categorizer] Failed to create AI session");
      }
    } else {
      console.log("[Site Categorizer] AI API not available");
    }
  } catch (err) {
    console.error("[Site Categorizer] AI categorization error:", err);
  }

  const meta: SiteMeta = {
    domain,
    category,
    display_name: domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    favicon: undefined,
    first_categorized: existing ? existing.first_categorized : now,
    last_updated: now,
    confidence,
  };

  metas[domain] = meta;
  await writeSiteMetas(metas);
  
  console.log("[Site Categorizer] Final result:", {
    domain: meta.domain,
    category: meta.category,
    confidence: meta.confidence,
  });
  console.log("[Site Categorizer] Saved to storage");

  return meta;
}

export default categorizeSiteByMetadata;
