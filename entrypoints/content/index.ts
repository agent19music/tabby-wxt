import {
  scanPageContent,
  scanPageContentWithAI,
  isSocialMediaUrl,
} from "@/components/functions/content_scanner";
import type { PageData } from "@/components/functions/content_scanner";

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
        console.log("Starting page extraction...");
        const pageData = await scanPageContentWithAI();
        console.log("Page data extracted:", pageData);
        
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
            const pageData = await scanPageContentWithAI();
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
