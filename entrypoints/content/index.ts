import { type PageData } from "@/components/functions/content_scanner";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",

  main() {
    // Mark that content script is loaded
    (window as any).tabbyContentScript = true;

    console.log("Tabby content script loaded on:", window.location.href);

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
          // Import the scanner function dynamically
          import("@/components/functions/content_scanner")
            .then(({ scanPageContent }) => {
              const pageData = scanPageContent();
              console.log("Sending page content:", {
                title: pageData.title,
                url: pageData.url,
                contentLength: pageData.content.length,
                headingsCount: pageData.headings.length,
                imagesCount: pageData.images.length,
              });

              sendResponse({
                success: true,
                data: {
                  title: pageData.title,
                  url: pageData.url,
                  text: pageData.content,
                  headings: pageData.headings,
                  images: pageData.images,
                  timestamp: pageData.timestamp,
                },
              });
            })
            .catch((error) => {
              console.error("Error importing scanner:", error);
              sendResponse({ success: false, error: "Failed to load scanner" });
            });
        } catch (error) {
          console.error("Error extracting content:", error);
          sendResponse({ success: false, error: String(error) });
        }
      }

      return true;
    });
  },
});
