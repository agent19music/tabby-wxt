import { db } from "@/lib/db";

export default defineBackground(() => {
  // Initialize DB on install
  chrome.runtime.onInstalled.addListener(async () => {
    await db.init();
    console.log("tabby-test: ========================================");
    console.log("tabby-test: 📦 DB initialized");
    console.log("tabby-test: ℹ️  Chrome AI checks happen in content scripts");
    console.log("tabby-test: ========================================");
  });

  // Handle messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SAVE_PRODUCT") {
      handleSaveProduct(message.data).then(sendResponse);
      return true;
    }

    if (message.type === "TRACK_VISIT") {
      handleTrackVisit(message.data).then(sendResponse);
      return true;
    }

    if (message.type === "GET_ANALYTICS") {
      handleGetAnalytics().then(sendResponse);
      return true;
    }

    if (message.type === "SEARCH_HISTORY") {
      handleSearchHistory(message.data).then(sendResponse);
      return true;
    }
  });

  async function handleTrackVisit(data: any) {
    try {
      console.log('tabby-test: Tracking non-product visit:', data.url);
      
      // NOTE: AI enhancement happens in content script (where window.ai exists)
      // The metadata here is already enhanced by the content script
      const metadata = data.metadata || {};
      
      console.log('tabby-test: Received metadata from content script:', {
        hasSearchableDescription: !!metadata.searchableDescription,
        hasAITags: !!metadata.aiTags,
        hasAISummary: !!metadata.aiSummary,
        aiTagsCount: metadata.aiTags?.length || 0
      });

      await db.addSiteVisit({
        url: data.url,
        site: data.site || new URL(data.url).hostname,
        title: data.title || 'Untitled',
        isProductPage: false,
        metadata // Enhanced metadata with AI tags
      });

      return { success: true };
    } catch (error: any) {
      console.error('tabby-test: Visit tracking failed:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  async function handleGetAnalytics() {
    try {
      console.log("tabby-test: Generating analytics report");

      const analytics = await db.getWeeklyAnalytics();

      return { success: true, analytics };
    } catch (error: any) {
      console.error("tabby-test: Analytics generation failed:", error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  }

  async function handleSearchHistory(data: any) {
    try {
      console.log("tabby-test: Searching history with query:", data.query);

      const results = await db.searchSiteVisits(data.query, {
        since: data.since,
        limit: data.limit || 20,
      });

      console.log("tabby-test: Search found", results.length, "results");

      return { success: true, results };
    } catch (error: any) {
      console.error("tabby-test: Search failed:", error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  }

  async function handleSaveProduct(productData: any) {
    try {
      console.log("tabby-test: Saving product:", productData.title);

      // Normalize title for matching
      const normalizedTitle = productData.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .trim();

      console.log("tabby-test: Normalized title:", normalizedTitle);

      // Generate image hash if available
      let imageHash = null;
      if (productData.imageUrl) {
        imageHash = await db.hashImage(productData.imageUrl);
        console.log("tabby-test: Image hash:", imageHash);
      }

      // Check if we've seen this exact product (across all sites)
      const existingProducts = (await db.getAllProducts()) as any[];
      const similarProduct = existingProducts.find((p: any) => {
        const similarity = calculateSimilarity(
          p.normalizedTitle,
          normalizedTitle,
        );
        return similarity > 0.85; // 85% similarity threshold for cross-site matching
      });

      let productId: number;
      const site = productData.site || new URL(productData.url).hostname;

      if (similarProduct) {
        console.log("tabby-test: Found similar product:", similarProduct.id);
        productId = similarProduct.id;

        // Update product stats
        await db.updateProduct(productId, {
          viewCount: (similarProduct.viewCount || 0) + 1,
          siteCount: (similarProduct.siteCount || 0) + 1,
        });
      } else {
        // New canonical product
        productId = (await db.addProduct({
          title: productData.title,
          normalizedTitle,
          category: productData.category || ["Uncategorized"],
          brand: productData.brand,
          firstSeen: Date.now(),
        })) as number;

        console.log("tabby-test: Created new canonical product:", productId);
      }

      // Add site-specific product entry
      await db.addSiteProduct({
        productId,
        site,
        url: productData.url,
        title: productData.title,
        price: productData.price,
        currency: productData.currency || "USD",
        imageUrl: productData.imageUrl,
        imageHash,
        specs: productData.specs,
      });

      // Track the site visit
      await db.addSiteVisit({
        url: productData.url,
        site,
        title: productData.title,
        isProductPage: true,
        productId,
        metadata: productData.metadata, // Include metadata for better tagging
      });

      console.log("tabby-test: Product saved to site:", site);
      console.log("tabby-test: Visit tracked with tags");

      return { success: true, productId };
    } catch (error: any) {
      console.error("tabby-test: Save failed:", error);
      return { success: false, error: error?.message || "Unknown error" };
    }
  }

  function calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

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
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
});
