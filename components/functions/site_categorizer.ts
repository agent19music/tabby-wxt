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
  console.log({ domainRaw, domain });

  const metas = await readSiteMetas();
  const existing = metas[domain];

  const now = Date.now();
  if (existing) {
    const ageDays = (now - existing.last_updated) / (1000 * 60 * 60 * 24);
    if (ageDays < STORAGE_LIMITS.SITE_META_CACHE_DAYS) {
      // Fresh enough
      return existing;
    }
  }

  // Known domain quick path
  const known = KNOWN_DOMAINS[domain];
  if (known) {
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
    return meta;
  }

  // Fall back to AI classification
  let category = SiteCategory.UNKNOWN;
  let confidence = 0;

  try {
    if (isPromptAPIAvailable && isPromptAPIAvailable()) {
      const session = await getAISession();
      if (session) {
        const choices = Object.values(SiteCategory).map((c) => `- ${c}`).join("\n");
        const prompt = `You are a website categorization assistant. Given the site domain, URL, title, and meta description, choose the single best category from the list below and return only the category token (one of the values exactly):\n\n${choices}\n\nDomain: ${domain}\nURL: ${opts.url}\nTitle: ${opts.title || ""}\nDescription: ${opts.description || ""}\n\nRespond with a single category token (for example: \"ecommerce\").`;

        const responseRaw = await session.prompt(prompt, { responseConstraint: undefined });
        const response = (responseRaw || "").trim().toLowerCase();

        // Map response to enum if possible
        const matched = Object.values(SiteCategory).find((v) => v === response);
        if (matched) {
          category = matched;
          confidence = 80;
        } else {
          // Try to extract token from longer response
          const token = response.split(/\s|[:\n]/).find((t) => Object.values(SiteCategory).includes(t as SiteCategory));
          if (token) {
            category = token as SiteCategory;
            confidence = 70;
          }
        }
      }
    }
  } catch (err) {
    console.warn("AI categorization failed:", err);
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

  return meta;
}

export default categorizeSiteByMetadata;
