import {
  scanPageContent,
  scanPageContentWithAI,
  isSocialMediaUrl,
  isYoutubeWatchPage,
  scanYoutubeVideo,
} from "@/components/functions/content_scanner";
import type { PageData } from "@/components/functions/content_scanner";
import { storePageData, shouldScanUrl } from "@/components/functions/db/products_site_storage";
import { saveYoutubeReview, getYoutubeReviewByVideoId } from "@/components/functions/db/youtube_storage";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",

  main() {
    // Mark that content script is loaded
    (window as any).tabbyContentScript = true;

    console.log("Tabby content script loaded on:", window.location.href);

    if ((window as any).__tabbyAutoExtractionInitialized) {
      return;
    }

    (window as any).__tabbyAutoExtractionInitialized = true;

    const AUTO_EXTRACT_DELAY_MS = 5000;
    let extractionTimer: number | null = null;
    let extractionTriggered = false;
    let currentUrl = window.location.href;

    const clearExtractionTimer = () => {
      if (extractionTimer !== null) {
        window.clearTimeout(extractionTimer);
        extractionTimer = null;
      }
    };

    const detachLifecycleListeners = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", clearExtractionTimer);
      window.removeEventListener("beforeunload", clearExtractionTimer);
    };

    const triggerExtraction = async () => {
      if (extractionTriggered) return;
      extractionTriggered = true;
      clearExtractionTimer();
      detachLifecycleListeners();

      try {
        const currentUrl = window.location.href;
        
        // Special handling for YouTube watch pages
        if (isYoutubeWatchPage()) {
          console.log("[Content Script] 🎬 === Detected YouTube watch page ===");
          console.log("[Content Script] URL:", currentUrl);
          console.log("[Content Script] Checking for product review...");
          
          // Wait a bit for YouTube's dynamic content to load
          console.log("[Content Script] Waiting 3 seconds for YouTube content to load...");
          await new Promise(resolve => setTimeout(resolve, 3000));
          console.log("[Content Script] Wait complete, starting scan...");
          
          const youtubeData = await scanYoutubeVideo();
          console.log("[Content Script] Scan complete. Result:", youtubeData);
          
          if (youtubeData && youtubeData.reviewAnalysis.is_product_review) {
            console.log("[Content Script] ✅ Product review detected! Saving to storage...");
            console.log("[Content Script] Product:", youtubeData.reviewAnalysis.product_name);
            console.log("[Content Script] Category:", youtubeData.reviewAnalysis.product_category);
            console.log("[Content Script] Sentiment:", youtubeData.reviewAnalysis.overall_sentiment);
            
            try {
              console.log("[Content Script] Preparing review data for storage...");
              const reviewData = {
                video_id: youtubeData.videoData.video_id,
                video_title: youtubeData.videoData.video_title,
                video_url: youtubeData.videoData.video_url,
                channel_name: youtubeData.videoData.channel_name,
                thumbnail_url: youtubeData.videoData.thumbnail_url,
                review_type: youtubeData.reviewAnalysis.review_type || "single_review",
                // Single review fields
                product_name: youtubeData.reviewAnalysis.product_name || undefined,
                product_category: youtubeData.reviewAnalysis.product_category || undefined,
                review_summary: youtubeData.reviewAnalysis.review_summary || undefined,
                pros: youtubeData.reviewAnalysis.pros || undefined,
                cons: youtubeData.reviewAnalysis.cons || undefined,
                overall_sentiment: youtubeData.reviewAnalysis.overall_sentiment || undefined,
                // Comparison fields (for versus/roundup)
                products: youtubeData.reviewAnalysis.products || undefined,
                comparison_summary: youtubeData.reviewAnalysis.comparison_summary || undefined,
                winner: youtubeData.reviewAnalysis.winner || undefined,
                // Affiliate links
                affiliate_links: youtubeData.affiliateLinks,
                watched_at: Date.now(),
              };
              console.log("[Content Script] Review data to save:", reviewData);
              
              console.log("[Content Script] Calling saveYoutubeReview()...");
              const reviewId = await saveYoutubeReview(reviewData);
              
              console.log("[Content Script] ✅ YouTube review saved with ID:", reviewId);
              
              // Send message to notify UI
              console.log("[Content Script] Sending message to background script...");
              chrome.runtime.sendMessage({
                action: "youtubeReviewDetected",
                data: youtubeData,
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("[Content Script] ❌ Error sending message:", chrome.runtime.lastError);
                } else {
                  console.log("[Content Script] ✅ Message sent successfully");
                }
              });
            } catch (storageError) {
              console.error("[Content Script] ❌ Failed to save YouTube review:", storageError);
              console.error("[Content Script] Storage error details:", {
                name: storageError instanceof Error ? storageError.name : 'Unknown',
                message: storageError instanceof Error ? storageError.message : String(storageError),
                stack: storageError instanceof Error ? storageError.stack : undefined
              });
            }
          } else {
            console.log("[Content Script] ℹ️ Not a product review video, skipping...");
            if (youtubeData) {
              console.log("[Content Script] Scan returned data but is_product_review is false");
            } else {
              console.log("[Content Script] Scan returned null (likely not a review or analysis failed)");
            }
          }
          
          console.log("[Content Script] 🏁 YouTube processing complete");
          return; // Skip normal page extraction for YouTube
        }
        
        // Check if URL was recently scanned (within 72 hours)
        const shouldScan = await shouldScanUrl(currentUrl);
        if (!shouldScan) {
          console.log("Skipping scan: URL was visited within the last 72 hours");
          return;
        }

        console.log("Starting page extraction...");
        const pageData = await scanPageContentWithAI();
        console.log("Page data extracted:", pageData);
        
        // Store the page data only if worth_storing is true
        if (pageData.worth_storing !== false) {
          try {
            const result = await storePageData(pageData);
            console.log("Page data stored in Chrome storage:", result);
          } catch (storageError) {
            console.error("Failed to store page data:", storageError);
          }
        } else {
          console.log("Skipping storage: page not worth storing (landing page, category page, etc.)");
        }
        
        chrome.runtime.sendMessage({
          action: "pageContentExtracted",
          data: pageData,
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError);
          } else {
            console.log("Message sent successfully");
          }
        });

      } catch (error) {
        console.error("Failed to automatically extract page content", error);
      }
    };

    function handleVisibilityChange() {
      if (document.hidden) {
        clearExtractionTimer();
      } else if (!extractionTriggered) {
        scheduleExtraction();
      }
    }

    const scheduleExtraction = () => {
      if (extractionTriggered) return;
      clearExtractionTimer();
      extractionTimer = window.setTimeout(() => {
        triggerExtraction();
      }, AUTO_EXTRACT_DELAY_MS);
    };

    const initializeAutoExtraction = () => {
      // Check for YouTube watch pages FIRST, before blocking social media
      if (isYoutubeWatchPage()) {
        console.log("Tabby: YouTube watch page detected, scheduling extraction");
        extractionTriggered = false;
        scheduleExtraction();
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", clearExtractionTimer);
        window.addEventListener("beforeunload", clearExtractionTimer);
        return;
      }

      // Now check for other social media (excluding YouTube watch pages)
      if (isSocialMediaUrl(window.location.href)) {
        console.log("Tabby: skipping auto extraction for social media page");
        detachLifecycleListeners();
        clearExtractionTimer();
        extractionTriggered = true;
        return;
      }

      extractionTriggered = false;
      scheduleExtraction();
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", clearExtractionTimer);
      window.addEventListener("beforeunload", clearExtractionTimer);
    };

    const handleUrlChange = () => {
      const newUrl = window.location.href;
      if (newUrl === currentUrl) return;
      currentUrl = newUrl;
      extractionTriggered = false;
      clearExtractionTimer();
      initializeAutoExtraction();
    };

    const wrapHistoryMethod = (
      method: "pushState" | "replaceState"
    ): void => {
      const original = history[method];
      if (typeof original !== "function") {
        return;
      }

      history[method] = function (this: History, ...args: unknown[]) {
        const result = original.apply(this, args as never);
        handleUrlChange();
        return result;
      } as typeof original;
    };

    if (!(window as any).__tabbyHistoryWrapped) {
      wrapHistoryMethod("pushState");
      wrapHistoryMethod("replaceState");
      window.addEventListener("popstate", handleUrlChange);
      window.addEventListener("hashchange", handleUrlChange);
      (window as any).__tabbyHistoryWrapped = true;
    }

    initializeAutoExtraction();

    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "getPageContent") {
        (async () => {
          try {
            const currentUrl = window.location.href;
            
            // Check if URL was recently scanned (within 72 hours)
            const shouldScan = await shouldScanUrl(currentUrl);
            if (!shouldScan) {
              console.log("Skipping manual scan: URL was visited within the last 72 hours");
              sendResponse({
                success: false,
                error: "URL was scanned within the last 72 hours. Please wait before rescanning.",
              });
              return;
            }

            const pageData = await scanPageContentWithAI();
            
            // Store the page data only if worth_storing is true
            if (pageData.worth_storing !== false) {
              try {
                const result = await storePageData(pageData);
                console.log("Page data stored in Chrome storage:", result);
              } catch (storageError) {
                console.error("Failed to store page data:", storageError);
              }
            } else {
              console.log("Skipping storage: page not worth storing");
            }
            
            sendResponse({
              success: true,
              data: pageData,
            });
          } catch (error) {
            console.error("Error extracting content:", error);
            sendResponse({ success: false, error: String(error) });
          }
        })();
        return true; // Keep channel open for async response
      }
      return true;
    });
  },
});
