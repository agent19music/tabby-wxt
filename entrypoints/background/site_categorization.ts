import { categorizeSiteByMetadata } from "@/components/functions/site_categorizer";

/**
 * Handles site categorization when page content is extracted
 */
export function initializeSiteCategorization() {
  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message?.action === "pageContentExtracted" && sender.tab?.id) {
      // Run site categorization in the background using URL/title/description
      (async () => {
        try {
          const url = message.data?.url || "";
          const domain = message.data?.domain || url;
          const title = message.data?.title || "";
          const description = message.data?.summary || message.data?.metaDescription || "";
          
          console.log("=== Starting site categorization ===");
          console.log("Domain:", domain);
          console.log("URL:", url);
          console.log("Title:", title);
          
          const meta = await categorizeSiteByMetadata({ 
            url, 
            domain, 
            title, 
            description 
          });
          
          console.log("=== Site categorized successfully ===");
          console.log({
            domain: meta.domain,
            category: meta.category,
            display_name: meta.display_name,
            confidence: meta.confidence,
            first_categorized: new Date(meta.first_categorized).toISOString(),
            last_updated: new Date(meta.last_updated).toISOString(),
          });
        } catch (err) {
          console.error("=== Site categorization failed ===", err);
        }
      })();
    }
  });

  console.log("Site categorization listener initialized");
}
