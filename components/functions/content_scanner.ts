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
  "google.com"
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
  product_category?: string;
  product_summary?: string;
  product_pros?: string[];
  product_cons?: string[];
  worth_storing?: boolean;
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
        worth_storing: {
          type: "boolean",
          description: "Determines if this specific page should be saved to browsing history. Return TRUE for pages with focused, specific content like: individual product details pages, detailed blog articles, documentation pages, tutorials, recipes, how-to guides, reviews of specific items, or any page with unique information a user might want to find again. Return FALSE for generic pages like: homepages, category listing pages (showing multiple products/items), search result pages, navigation/menu pages, login pages, checkout flows, or any page that serves primarily as a directory/index to other content rather than containing unique information itself."
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
        product_category: {
          type: "string",
          enum: [
            "electronics", "home_kitchen", "clothing_fashion", "beauty_personal_care",
            "health_wellness", "sports_outdoors", "toys_games", "baby_kids",
            "books", "movies_tv", "music", "video_games",
            "office_supplies", "school_supplies",
            "automotive", "motorcycle_powersports",
            "tools_hardware", "home_improvement", "lawn_garden",
            "pet_supplies","adult",
            "grocery", "gourmet_food", "beverages", "alcohol",
            "arts_crafts", "musical_instruments", "sewing_fabric", "party_supplies",
            "industrial_scientific", "collectibles_fine_art", "jewelry_watches",
            "luggage_travel", "furniture", "appliances", "bedding_bath",
            "gift_cards", "digital_products", "services", "subscriptions",
            "other"
          ],
          description: "The product category if this is a product page, otherwise null"
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
      required: ["summary", "tags", "is_product", "worth_storing"]
    };

    const prompt = `Analyze this webpage and provide structured information.

Title: ${title}

Content: ${content.slice(0, 3000)}

Carefully analyze the content and determine:

1. SUMMARY: Write a 2-3 sentence summary of what this specific page offers
2. TAGS: Identify 3-5 key topics/aspects
3. IS_PRODUCT: Is this a single product detail page on an ecommerce site? (not a category/listing page)
4. WORTH_STORING: Should this page be saved to history?
   - Answer TRUE if: This page has specific, unique content (e.g., a particular product, a specific article, a detailed guide, a recipe, documentation for a specific topic)
   - Answer FALSE if: This is a general directory page (e.g., homepage showing many products, category listing, search results, navigation page, login/checkout page)
   - Key question: "Would a user want to return to THIS EXACT page later, or would they just use it to navigate elsewhere?"
   
5. PRODUCT DETAILS (only if IS_PRODUCT is true):
   - Extract: price, discount percentage/amount, condition (new/refurbished/used/unknown)
   - Categorize using the provided category enum
   - Provide: brief summary, list of pros/benefits, list of cons/drawbacks

Respond with valid JSON matching the schema.`;

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
      worth_storing: parsed.worth_storing !== undefined ? parsed.worth_storing : true, // Default to true if not specified
      product_price: parsed.product_price || undefined,
      product_discount: parsed.product_discount || undefined,
      product_condition: (parsed.product_condition as ProductCondition) || undefined,
      product_category: parsed.product_category || undefined,
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
    worth_storing: aiData.worth_storing,
    product_price: aiData.product_price,
    product_discount: aiData.product_discount,
    product_condition: aiData.product_condition as ProductCondition | undefined,
    product_category: aiData.product_category,
    product_summary: aiData.product_summary,
    product_pros: aiData.product_pros,
    product_cons: aiData.product_cons,
    timestamp: Date.now(),
  };
}

// YouTube-specific scanning
export interface YoutubeVideoData {
  video_id: string;
  video_title: string;
  video_url: string;
  channel_name: string;
  thumbnail_url: string;
  description: string;
  timestamp: number;
}

function extractYoutubeTranscript(): string | null {
  try {
    console.log("[YouTube Scanner] 📝 Extracting transcript from page...");
    
    // Method 1: Try to extract from ytInitialPlayerResponse in page scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const content = script.textContent || '';
      
      // Look for ytInitialPlayerResponse
      if (content.includes('ytInitialPlayerResponse')) {
        console.log("[YouTube Scanner] Found ytInitialPlayerResponse in script tag");
        
        // Extract the JSON object - need to find the matching closing brace
        const startMatch = content.match(/ytInitialPlayerResponse\s*=\s*{/);
        if (startMatch) {
          const startIndex = startMatch.index! + startMatch[0].length - 1;
          let braceCount = 0;
          let endIndex = startIndex;
          
          // Find the matching closing brace
          for (let i = startIndex; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            else if (content[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i + 1;
                break;
              }
            }
          }
          
          const jsonStr = content.substring(startIndex, endIndex);
          if (jsonStr) {
            try {
              const playerResponse = JSON.parse(jsonStr);
            console.log("[YouTube Scanner] Successfully parsed ytInitialPlayerResponse");
            
            // Navigate to captions
            const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            
            if (captionTracks && captionTracks.length > 0) {
              console.log(`[YouTube Scanner] Found ${captionTracks.length} caption tracks`);
              
              // Prefer English captions
              let selectedTrack = captionTracks.find((track: any) => 
                track.languageCode === 'en' || track.languageCode?.startsWith('en')
              ) || captionTracks[0];
              
              console.log(`[YouTube Scanner] Selected track: ${selectedTrack.name?.simpleText || 'Unknown'} (${selectedTrack.languageCode})`);
              
              const captionUrl = selectedTrack.baseUrl;
              if (captionUrl) {
                console.log("[YouTube Scanner] Caption URL found, fetching transcript...");
                // We need to fetch this URL, but we can't use async here
                // So we'll return a marker and handle it differently
                return captionUrl;
              }
            } else {
              console.log("[YouTube Scanner] ⚠️ No caption tracks found in player response");
            }
            } catch (parseError) {
              console.log("[YouTube Scanner] Failed to parse ytInitialPlayerResponse:", parseError);
            }
          }
        }
      }
    }
    
    console.log("[YouTube Scanner] ⚠️ Could not extract transcript data");
    return null;
  } catch (error) {
    console.error("[YouTube Scanner] ❌ Failed to extract transcript:", error);
    return null;
  }
}

async function fetchTranscriptFromUrl(captionUrl: string): Promise<string | null> {
  try {
    console.log("[YouTube Scanner] Fetching transcript from URL...");
    const response = await fetch(captionUrl);
    const xmlText = await response.text();
    console.log(`[YouTube Scanner] Received transcript XML (${xmlText.length} chars)`);
    
    // Parse XML captions
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const textNodes = xmlDoc.querySelectorAll('text');
    
    const transcript = Array.from(textNodes)
      .map(node => node.textContent?.trim())
      .filter(text => text && text.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`[YouTube Scanner] ✅ Extracted transcript: ${transcript.length} characters`);
    return transcript;
  } catch (error) {
    console.error("[YouTube Scanner] ❌ Failed to fetch transcript:", error);
    return null;
  }
}

function extractYoutubeMetadata(): YoutubeVideoData | null {
  try {
    console.log("[YouTube Scanner] 🎬 Extracting YouTube metadata...");
    const url = window.location.href;
    console.log(`[YouTube Scanner] Current URL: ${url}`);
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    console.log(`[YouTube Scanner] Video ID: ${videoId}`);
    
    if (!videoId) {
      console.log("[YouTube Scanner] ⚠️ No video ID found in URL");
      return null;
    }

    // Extract video title
    console.log("[YouTube Scanner] Extracting video title...");
    const titleElement = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                        document.querySelector('h1.title yt-formatted-string');
    const videoTitle = titleElement?.textContent?.trim() || document.title;
    console.log(`[YouTube Scanner] Video title: ${videoTitle}`);

    // Extract channel name
    console.log("[YouTube Scanner] Extracting channel name...");
    const channelElement = document.querySelector('ytd-channel-name a') ||
                          document.querySelector('yt-formatted-string.ytd-channel-name a');
    const channelName = channelElement?.textContent?.trim() || "Unknown Channel";
    console.log(`[YouTube Scanner] Channel name: ${channelName}`);

    // Extract description
    console.log("[YouTube Scanner] Extracting description...");
    const descriptionElement = document.querySelector('#description-inline-expander') ||
                              document.querySelector('ytd-text-inline-expander#description-inline-expander');
    const description = descriptionElement?.textContent?.trim() || "";
    console.log(`[YouTube Scanner] Description length: ${description.length} characters`);

    // Get thumbnail URL
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    console.log(`[YouTube Scanner] Thumbnail URL: ${thumbnailUrl}`);

    const metadata = {
      video_id: videoId,
      video_title: videoTitle,
      video_url: url,
      channel_name: channelName,
      thumbnail_url: thumbnailUrl,
      description,
      timestamp: Date.now(),
    };
    
    console.log("[YouTube Scanner] ✅ Successfully extracted metadata:", metadata);
    return metadata;
  } catch (error) {
    console.error("[YouTube Scanner] ❌ Failed to extract YouTube metadata:", error);
    console.error("[YouTube Scanner] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

interface AffiliateLink {
  url: string;
  retailer: string;
  extracted_product?: string;
}

interface FilteredAffiliateLink extends AffiliateLink {
  relevance_score: number;
  is_spam: boolean;
  match_reason?: string;
}

function extractProductFromUrl(url: string, retailer: string): string | null {
  try {
    console.log(`[YouTube Scanner] Extracting product from URL: ${url}`);
    
    // Amazon specific extraction
    if (retailer === "Amazon") {
      // Pattern: amazon.com/Product-Name-Here/dp/B08N5WRWNW
      const dpMatch = url.match(/\/([^\/]+)\/dp\/[A-Z0-9]+/i);
      if (dpMatch) {
        const productSlug = dpMatch[1];
        // Convert URL slug to readable name: "Apple-MacBook-Pro-M4" -> "Apple MacBook Pro M4"
        const productName = productSlug.replace(/-/g, ' ').replace(/\+/g, ' ');
        console.log(`[YouTube Scanner] Extracted from Amazon DP: ${productName}`);
        return productName;
      }
      
      // Pattern: amazon.com/gp/product/B08N5WRWNW
      const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]+)/i);
      if (gpMatch) {
        console.log(`[YouTube Scanner] Amazon GP link (no product name in URL)`);
        return null; // Can't extract name from this format
      }
    }
    
    // Best Buy specific extraction
    if (retailer === "Best Buy") {
      // Pattern: bestbuy.com/site/apple-macbook-pro/6443842.p
      const match = url.match(/\/site\/([^\/]+)\//i);
      if (match) {
        const productSlug = match[1];
        const productName = productSlug.replace(/-/g, ' ');
        console.log(`[YouTube Scanner] Extracted from Best Buy: ${productName}`);
        return productName;
      }
    }
    
    // Newegg specific extraction
    if (retailer === "Newegg") {
      // Pattern: newegg.com/p/N82E16834725165 or newegg.com/asus-rog-laptop/p/...
      const match = url.match(/newegg\.com\/([^\/\?]+)/i);
      if (match) {
        const segment = match[1];
        if (!segment.startsWith('p') && segment.includes('-')) {
          const productName = segment.replace(/-/g, ' ');
          console.log(`[YouTube Scanner] Extracted from Newegg: ${productName}`);
          return productName;
        }
      }
    }
    
    // Generic extraction: look for product-name-like segments in URL path
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 3);
    for (const segment of pathSegments) {
      // Look for segments with dashes that might be product names
      if (segment.includes('-') && segment.length > 10) {
        const productName = segment.replace(/-/g, ' ').replace(/\+/g, ' ');
        console.log(`[YouTube Scanner] Extracted from generic path: ${productName}`);
        return productName;
      }
    }
    
    console.log(`[YouTube Scanner] Could not extract product name from URL`);
    return null;
  } catch (error) {
    console.error(`[YouTube Scanner] Error extracting product from URL:`, error);
    return null;
  }
}

function extractAffiliateLinks(description: string): Array<AffiliateLink> {
  console.log("[YouTube Scanner] 🔗 Extracting affiliate links from description...");
  const links: Array<AffiliateLink> = [];
  
  const patterns = [
    { regex: /(?:https?:\/\/)?(?:www\.)?amazon\.[a-z.]{2,6}\/[^\s)]+/gi, retailer: "Amazon" },
    { regex: /(?:https?:\/\/)?amzn\.to\/[^\s)]+/gi, retailer: "Amazon" },
    { regex: /(?:https?:\/\/)?(?:www\.)?bestbuy\.com\/[^\s)]+/gi, retailer: "Best Buy" },
    { regex: /(?:https?:\/\/)?(?:www\.)?newegg\.com\/[^\s)]+/gi, retailer: "Newegg" },
    { regex: /(?:https?:\/\/)?(?:www\.)?walmart\.com\/[^\s)]+/gi, retailer: "Walmart" },
    { regex: /(?:https?:\/\/)?(?:www\.)?target\.com\/[^\s)]+/gi, retailer: "Target" },
    { regex: /(?:https?:\/\/)?(?:www\.)?ebay\.com\/[^\s)]+/gi, retailer: "eBay" },
    { regex: /(?:https?:\/\/)?(?:www\.)?aliexpress\.com\/[^\s)]+/gi, retailer: "AliExpress" },
  ];

  for (const { regex, retailer } of patterns) {
    const matches = description.matchAll(regex);
    for (const match of matches) {
      let url = match[0];
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Extract product name from URL
      const extracted_product = extractProductFromUrl(url, retailer);
      
      links.push({ 
        url, 
        retailer,
        extracted_product: extracted_product || undefined
      });
      console.log(`[YouTube Scanner] Found ${retailer} link: ${url}${extracted_product ? ` (${extracted_product})` : ''}`);
    }
  }

  console.log(`[YouTube Scanner] ✅ Extracted ${links.length} affiliate links`);
  return links;
}

async function filterAffiliateLinks(
  links: AffiliateLink[],
  videoContext: {
    title: string;
    product_name: string;
    product_category: string;
    transcript?: string;
  }
): Promise<FilteredAffiliateLink[]> {
  console.log("[YouTube Scanner] 🧹 Filtering affiliate links for relevance...");
  console.log(`[YouTube Scanner] Video product: ${videoContext.product_name}`);
  console.log(`[YouTube Scanner] Total links to filter: ${links.length}`);
  
  if (links.length === 0) {
    return [];
  }
  
  try {
    if (typeof LanguageModel === "undefined") {
      console.log("[YouTube Scanner] ⚠️ LanguageModel not available, returning all links unfiltered");
      // Return all links with neutral scores if AI unavailable
      return links.map(link => ({
        ...link,
        relevance_score: 50,
        is_spam: false,
        match_reason: "AI unavailable - not filtered"
      }));
    }

    const availability = await LanguageModel.availability();
    if (availability.available === "no") {
      console.log("[YouTube Scanner] ⚠️ LanguageModel not available");
      return links.map(link => ({
        ...link,
        relevance_score: 50,
        is_spam: false,
        match_reason: "AI unavailable - not filtered"
      }));
    }

    const session = await LanguageModel.create({
      temperature: 0.3,
      topK: 3,
    });

    const schema = {
      type: "object",
      properties: {
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: {
                type: "number",
                description: "Index of the link in the original array"
              },
              relevance_score: {
                type: "number",
                description: "Relevance score 0-100. High score (80+) = highly relevant, Medium (50-79) = somewhat relevant, Low (<50) = spam/unrelated"
              },
              is_spam: {
                type: "boolean",
                description: "Is this link spam/unrelated to the video's main product?"
              },
              match_reason: {
                type: "string",
                description: "Brief explanation why this link is relevant or spam"
              }
            },
            required: ["index", "relevance_score", "is_spam", "match_reason"]
          }
        }
      },
      required: ["links"]
    };

    // Build link descriptions for analysis
    const linkDescriptions = links.map((link, index) => {
      return `[${index}] ${link.retailer}: ${link.extracted_product || 'Unknown product'} (${link.url})`;
    }).join('\n');

    const prompt = `Analyze these affiliate links and determine if they're relevant to the video's main product.

Video: "${videoContext.title}"
Main Product: ${videoContext.product_name}
Category: ${videoContext.product_category}

Affiliate Links:
${linkDescriptions}

SCORING RULES:
- HIGH RELEVANCE (80-100): Link is for the EXACT product being reviewed (same brand, model, variant)
- MEDIUM RELEVANCE (50-79): Link is for a related product (accessories, similar products in same category)
- LOW RELEVANCE (0-49): Unrelated product, wrong category, generic spam

SPAM INDICATORS:
- Product name doesn't match video topic at all (e.g., "Green Powerbank" on MacBook video)
- Generic homepage links without specific product
- Products from completely different categories
- Random affiliate links stuffed in description

RELEVANT INDICATORS:
- Product name matches video product (fuzzy match OK: "MacBook Pro M4" ~ "Apple MacBook Pro 14")
- Brand domain matches product brand (lenovo.com on Legion video)
- Accessories for the main product (case for the phone being reviewed)
- Clearly labeled as "buy here" or first link in description

For each link, assign a relevance score and explain why.`;

    console.log("[YouTube Scanner] Sending links to AI for filtering...");
    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });

    session.destroy();

    const parsed = JSON.parse(result);
    console.log("[YouTube Scanner] ✅ AI filtering complete");
    
    // Map results back to links
    const filteredLinks: FilteredAffiliateLink[] = links.map((link, index) => {
      const analysis = parsed.links.find((l: any) => l.index === index);
      
      if (analysis) {
        console.log(`[YouTube Scanner] Link ${index}: ${link.retailer} - Score: ${analysis.relevance_score}, Spam: ${analysis.is_spam}`);
        console.log(`[YouTube Scanner]   Reason: ${analysis.match_reason}`);
        return {
          ...link,
          relevance_score: analysis.relevance_score,
          is_spam: analysis.is_spam,
          match_reason: analysis.match_reason
        };
      } else {
        // Fallback if AI didn't analyze this link
        return {
          ...link,
          relevance_score: 50,
          is_spam: false,
          match_reason: "Not analyzed by AI"
        };
      }
    });

    // Sort by relevance score (highest first)
    filteredLinks.sort((a, b) => b.relevance_score - a.relevance_score);
    
    const spamCount = filteredLinks.filter(l => l.is_spam).length;
    console.log(`[YouTube Scanner] 📊 Filtering results: ${filteredLinks.length} total, ${spamCount} marked as spam`);
    
    return filteredLinks;
  } catch (error) {
    console.error("[YouTube Scanner] ❌ Failed to filter affiliate links:", error);
    // Return all links unfiltered if error
    return links.map(link => ({
      ...link,
      relevance_score: 50,
      is_spam: false,
      match_reason: "Filtering failed"
    }));
  }
}

async function analyzeYoutubeReview(
  videoData: YoutubeVideoData,
  transcript?: string | null
): Promise<{
  is_product_review: boolean;
  review_type?: "single_review" | "versus" | "roundup";
  // Single review fields
  product_name?: string;
  product_category?: string;
  review_summary?: string;
  pros?: string[];
  cons?: string[];
  overall_sentiment?: "positive" | "neutral" | "negative";
  // Comparison fields
  products?: Array<{
    product_name: string;
    product_category: string;
    rank?: number;
    pros: string[];
    cons: string[];
    verdict?: string;
    price_mentioned?: string;
    sentiment?: "positive" | "neutral" | "negative";
  }>;
  comparison_summary?: string;
  winner?: string;
} | null> {
  try {
    console.log("[YouTube Scanner] 🤖 Analyzing video for product review...");
    console.log(`[YouTube Scanner] Video: ${videoData.video_title}`);
    console.log(`[YouTube Scanner] Channel: ${videoData.channel_name}`);
    console.log(`[YouTube Scanner] Has transcript: ${transcript ? 'YES' : 'NO'}`);
    if (transcript) {
      console.log(`[YouTube Scanner] Transcript length: ${transcript.length} characters`);
    }
    
    if (typeof LanguageModel === "undefined") {
      console.log("[YouTube Scanner] ⚠️ LanguageModel API not available");
      return null;
    }

    console.log("[YouTube Scanner] Checking LanguageModel availability...");
    const availability = await LanguageModel.availability();
    console.log(`[YouTube Scanner] LanguageModel availability: ${availability.available}`);
    if (availability.available === "no") {
      console.log("[YouTube Scanner] ⚠️ LanguageModel not available");
      return null;
    }

    console.log("[YouTube Scanner] Creating AI session...");
    const session = await LanguageModel.create({
      temperature: 0.5,
      topK: 3,
    });
    console.log("[YouTube Scanner] ✅ AI session created");

    const categoryEnum = [
      "electronics", "home_kitchen", "clothing_fashion", "beauty_personal_care",
      "health_wellness", "sports_outdoors", "toys_games", "baby_kids",
      "books", "movies_tv", "music", "video_games",
      "office_supplies", "school_supplies",
      "automotive", "motorcycle_powersports",
      "tools_hardware", "home_improvement", "lawn_garden",
      "pet_supplies", "adult",
      "grocery", "gourmet_food", "beverages", "alcohol",
      "arts_crafts", "musical_instruments", "sewing_fabric", "party_supplies",
      "industrial_scientific", "collectibles_fine_art", "jewelry_watches",
      "luggage_travel", "furniture", "appliances", "bedding_bath",
      "gift_cards", "digital_products", "services", "subscriptions",
      "other"
    ];

    const schema = {
      type: "object",
      properties: {
        is_product_review: {
          type: "boolean",
          description: "Is this video a product review/comparison? (Reviews, tests, compares, or evaluates products)"
        },
        review_type: {
          type: "string",
          enum: ["single_review", "versus", "roundup"],
          description: "Type: single_review=1 product, versus=2 products compared (X vs Y), roundup=3+ products ranked (Top 5, Best of 2025)"
        },
        product_name: {
          type: "string",
          description: "For single_review: The exact product name/model"
        },
        product_category: {
          type: "string",
          enum: categoryEnum,
          description: "For single_review: Product category"
        },
        review_summary: {
          type: "string",
          description: "For single_review: 2-3 sentence summary"
        },
        pros: {
          type: "array",
          items: { type: "string" },
          description: "For single_review: Pros mentioned"
        },
        cons: {
          type: "array",
          items: { type: "string" },
          description: "For single_review: Cons mentioned"
        },
        overall_sentiment: {
          type: "string",
          enum: ["positive", "neutral", "negative"],
          description: "For single_review: Overall sentiment"
        },
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_name: { type: "string" },
              product_category: { type: "string", enum: categoryEnum },
              rank: { type: "number", description: "For roundup: 1=best, 2=second best, etc." },
              pros: { type: "array", items: { type: "string" } },
              cons: { type: "array", items: { type: "string" } },
              verdict: { type: "string", description: "Winner, Best Value, Runner-up, etc." },
              price_mentioned: { type: "string" },
              sentiment: { type: "string", enum: ["positive", "neutral", "negative"] }
            },
            required: ["product_name", "product_category", "pros", "cons"]
          },
          description: "For versus/roundup: Array of products being compared"
        },
        comparison_summary: {
          type: "string",
          description: "For versus/roundup: Overall comparison summary (2-3 sentences)"
        },
        winner: {
          type: "string",
          description: "For versus: Which product won the comparison"
        }
      },
      required: ["is_product_review"]
    };

    // Build prompt with transcript if available
    let contentSection = `Video Title: ${videoData.video_title}
Channel: ${videoData.channel_name}
Description: ${videoData.description.slice(0, 1500)}`;

    if (transcript && transcript.length > 0) {
      contentSection += `

Video Transcript (what the reviewer actually said):
${transcript.slice(0, 4000)}`;
    }

    const prompt = `Analyze this YouTube video to determine if it's a product review/comparison.

${contentSection}

REVIEW TYPES:
1. SINGLE_REVIEW: Reviews ONE product (e.g., "iPhone 15 Pro Review")
2. VERSUS: Compares TWO products head-to-head (e.g., "M4 MacBook Pro vs M2 Max")
3. ROUNDUP: Ranks 3+ products (e.g., "Top 5 Budget Laptops 2025", "Best Phones Under $500")

A product review video typically:
- Reviews, tests, or evaluates specific products
- Compares multiple products
- Ranks products (top 5, best of, etc.)
- Provides buying recommendations with pros/cons

NOT a product review:
- General tutorials or how-to videos
- Vlogs or entertainment content
- News or announcements without product analysis

${transcript ? 'IMPORTANT: Use the transcript to extract product names, pros/cons mentioned verbally, rankings, and verdicts.' : ''}

EXTRACTION RULES:

FOR SINGLE_REVIEW:
- Extract product name (exact model/variant from transcript or title)
- Extract pros/cons mentioned
- Provide overall sentiment and summary

FOR VERSUS:
- Extract BOTH product names
- Extract pros/cons for EACH product
- Identify which product won (winner field)
- Provide comparison summary

FOR ROUNDUP:
- Extract ALL product names (at least 3)
- Assign rank to each (1 = best, 2 = second best, etc.)
- Extract pros/cons for EACH product
- Provide verdict for each ("Best Overall", "Best Value", "Best for Gaming", etc.)
- Provide overall comparison summary

Respond with valid JSON matching the schema.`;

    console.log("[YouTube Scanner] Sending prompt to AI...");
    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });
    console.log("[YouTube Scanner] ✅ Received AI response:", result);

    session.destroy();
    console.log("[YouTube Scanner] AI session destroyed");

    console.log("[YouTube Scanner] Parsing AI response...");
    const parsed = JSON.parse(result);
    console.log("[YouTube Scanner] ✅ Parsed analysis:", parsed);
    
    if (parsed.is_product_review) {
      console.log(`[YouTube Scanner] 🎯 Identified as ${parsed.review_type}!`);
      
      if (parsed.review_type === "single_review") {
        console.log(`[YouTube Scanner] Product: ${parsed.product_name}`);
        console.log(`[YouTube Scanner] Category: ${parsed.product_category}`);
        console.log(`[YouTube Scanner] Sentiment: ${parsed.overall_sentiment}`);
      } else if (parsed.review_type === "versus") {
        console.log(`[YouTube Scanner] Comparing ${parsed.products?.length || 0} products`);
        console.log(`[YouTube Scanner] Winner: ${parsed.winner}`);
        parsed.products?.forEach((p: any, i: number) => {
          console.log(`[YouTube Scanner]   Product ${i + 1}: ${p.product_name} (${p.verdict || 'no verdict'})`);
        });
      } else if (parsed.review_type === "roundup") {
        console.log(`[YouTube Scanner] Roundup of ${parsed.products?.length || 0} products`);
        parsed.products?.forEach((p: any) => {
          console.log(`[YouTube Scanner]   #${p.rank}: ${p.product_name} - ${p.verdict || 'no verdict'}`);
        });
      }
    } else {
      console.log("[YouTube Scanner] ℹ️ Not identified as a product review");
    }
    
    return parsed;
  } catch (error) {
    console.error("[YouTube Scanner] ❌ Failed to analyze YouTube review:", error);
    console.error("[YouTube Scanner] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

export function isYoutubeWatchPage(): boolean {
  const isYoutube = window.location.hostname.includes('youtube.com') && 
                    window.location.pathname === '/watch';
  console.log(`[YouTube Scanner] Is YouTube watch page: ${isYoutube}`);
  return isYoutube;
}

export async function scanYoutubeVideo(): Promise<{
  videoData: YoutubeVideoData;
  reviewAnalysis: Awaited<ReturnType<typeof analyzeYoutubeReview>>;
  affiliateLinks: FilteredAffiliateLink[];
  transcript?: string;
} | null> {
  console.log("[YouTube Scanner] 🎥 === Starting YouTube video scan ===");
  
  if (!isYoutubeWatchPage()) {
    console.log("[YouTube Scanner] ⚠️ Not on a YouTube watch page, aborting");
    return null;
  }

  const videoData = extractYoutubeMetadata();
  if (!videoData) {
    console.log("[YouTube Scanner] ⚠️ Failed to extract video metadata, aborting");
    return null;
  }

  // Extract transcript
  console.log("[YouTube Scanner] Extracting transcript...");
  const transcriptUrl = extractYoutubeTranscript();
  let transcript: string | null = null;
  
  if (transcriptUrl) {
    console.log("[YouTube Scanner] Transcript URL found, fetching...");
    transcript = await fetchTranscriptFromUrl(transcriptUrl);
    if (transcript) {
      console.log(`[YouTube Scanner] ✅ Transcript extracted: ${transcript.length} characters`);
    } else {
      console.log("[YouTube Scanner] ⚠️ Failed to fetch transcript from URL");
    }
  } else {
    console.log("[YouTube Scanner] ℹ️ No transcript available for this video");
  }

  console.log("[YouTube Scanner] Analyzing YouTube video for product review...");
  const reviewAnalysis = await analyzeYoutubeReview(videoData, transcript);
  
  if (!reviewAnalysis) {
    console.log("[YouTube Scanner] ⚠️ Review analysis failed or returned null");
    return null;
  }
  
  if (!reviewAnalysis.is_product_review) {
    console.log("[YouTube Scanner] ℹ️ Not a product review, skipping...");
    return null;
  }

  console.log("[YouTube Scanner] 🎯 Video identified as product review!");
  
  // Extract raw affiliate links
  const rawLinks = extractAffiliateLinks(videoData.description);
  
  // Filter links for relevance
  console.log("[YouTube Scanner] Filtering affiliate links...");
  const filteredLinks = await filterAffiliateLinks(rawLinks, {
    title: videoData.video_title,
    product_name: reviewAnalysis.product_name || "Unknown",
    product_category: reviewAnalysis.product_category || "other",
    transcript: transcript || undefined,
  });
  
  // Keep only non-spam links or high-relevance links
  const relevantLinks = filteredLinks.filter(link => !link.is_spam || link.relevance_score >= 70);
  console.log(`[YouTube Scanner] Kept ${relevantLinks.length} relevant links out of ${filteredLinks.length} total`);
  
  const result = {
    videoData,
    reviewAnalysis,
    affiliateLinks: relevantLinks,
    transcript: transcript || undefined,
  };
  
  console.log("[YouTube Scanner] ✅ === YouTube video scan complete ===");
  console.log("[YouTube Scanner] Final result:", result);
  
  return result;
}
