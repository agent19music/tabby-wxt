import {
  type PageData,
  scanPageContent,
} from "@/components/functions/content_scanner";

declare const defineContentScript: <T>(config: T) => T;
declare const chrome: {
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message: Record<string, unknown>,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => void
      ): void;
    };
  };
};

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",

  main() {
    // Mark that content script is loaded
    (window as any).tabbyContentScript = true;

    console.log("Tabby content script loaded on:", window.location.href);

    let cachedPageData: PageData | null = null;
    let cachedAt = 0;

    const getPageSnapshot = (force = false): PageData => {
      const now = Date.now();
      if (!force && cachedPageData && now - cachedAt < 5_000) {
        return cachedPageData;
      }
      cachedPageData = scanPageContent();
      cachedAt = now;
      return cachedPageData;
    };

    // Simple test function
    const testFunction = () => {
      return {
        title: document.title,
        url: window.location.href,
        timestamp: Date.now(),
      };
    };

    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Content script received message:", request);

      if (request.action === "test") {
        try {
          const data = testFunction();
          console.log("Sending test data:", data);
          sendResponse({ success: true, data });
        } catch (error) {
          console.error("Error in test:", error);
          sendResponse({ success: false, error: String(error) });
        }
      }

      if (request.action === "getPageContent") {
        try {
          const pageData = getPageSnapshot(request.force === true);
          console.log("Sending page content:", {
            title: pageData.title,
            url: pageData.url,
            contentLength: pageData.content.length,
            headingsCount: pageData.headings.length,
            imagesCount: pageData.images.length,
            hasProductData: Boolean(pageData.productData),
          });

          sendResponse({
            success: true,
            data: pageData,
          });
        } catch (error) {
          console.error("Error extracting content:", error);
          sendResponse({ success: false, error: String(error) });
        }
      }

      if (request.action === "getEnhancedProductData") {
        try {
          const pageData = getPageSnapshot(request.force === true);
          sendResponse({
            success: true,
            data: {
              productData: pageData.productData,
              metadata: pageData.metadata,
              favicon: pageData.favicon,
              structuredData: pageData.structuredData,
              title: pageData.title,
              url: pageData.url,
              html: pageData.html,
              content: pageData.content,
            },
          });
        } catch (error) {
          console.error("Error getting enhanced product data:", error);
          sendResponse({ success: false, error: String(error) });
        }
      }

      return true;
    });
  },
});
