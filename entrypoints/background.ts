export default defineBackground(() => {
  console.log("Background script loaded");

  // Enable side panel when extension is installed
  chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed, enabling side panel");
    try {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
      console.log("Side panel behavior set successfully");
    } catch (error) {
      console.error("Error setting side panel behavior:", error);
    }
  });

  // Manually inject content script on tab updates
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      !tab.url.startsWith("chrome://")
    ) {
      try {
        // Check if content script is already injected
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => {
            return window.hasOwnProperty("tabbyContentScript");
          },
        });

        if (!results[0]?.result) {
          // Inject content script
          await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
              // Mark that content script is loaded

              console.log(
                "Tabby content script loaded on:",
                window.location.href
              );

              // Simple test function
              const testFunction = () => {
                return {
                  title: document.title,
                  url: window.location.href,
                  timestamp: Date.now(),
                };
              };

              // Content scanner function
              const scanPageContent = () => {
                const url = window.location.href;
                const title = document.title;
                const content = document.body.innerText.slice(0, 5000);

                const headings = Array.from(
                  document.querySelectorAll("h1, h2, h3")
                )
                  .map((h) => h.textContent?.trim())
                  .filter(Boolean);

                const images = Array.from(document.querySelectorAll("img"))
                  .map((img) => img.src)
                  .filter((src) => src && !src.includes("data:image"))
                  .slice(0, 5);

                return {
                  url,
                  title,
                  content,
                  headings,
                  images,
                  timestamp: Date.now(),
                };
              };

              // Listen for messages
              chrome.runtime.onMessage.addListener(
                (request, sender, sendResponse) => {
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
                    } catch (error) {
                      console.error("Error extracting content:", error);
                      sendResponse({ success: false, error: String(error) });
                    }
                  }

                  return true;
                }
              );
            },
          });
          console.log("Content script injected into tab:", tabId);
        }
      } catch (error) {
        console.error("Error injecting content script:", error);
      }
    }
  });
});
