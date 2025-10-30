import {
  scanPageContent,
  scanPageContentWithAI,
  isSocialMediaUrl,
} from "@/components/functions/content_scanner";
import type { PageData } from "@/components/functions/content_scanner";
import { storePageData, shouldScanUrl } from "@/components/functions/db/products_site_storage";

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
