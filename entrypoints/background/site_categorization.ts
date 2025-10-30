// import { categorizeSiteByMetadata } from "@/components/functions/site_categorizer";

// /**
//  * Handles site categorization when page content is extracted
//  */
// export function initializeSiteCategorization() {
//   chrome.runtime.onMessage.addListener((message, sender) => {
//     if (message?.action === "pageContentExtracted" && sender.tab?.id) {
//       // Run site categorization in the background using URL/title/description
//       (async () => {
//         try {
//           const url = message.data?.url || "";
//           const domain = message.data?.domain || url;
//           const title = message.data?.title || "";
//           const description = message.data?.summary || message.data?.metaDescription || "";
          
//           console.log("Starting site categorization for:", domain);
          
//           const meta = await categorizeSiteByMetadata({ 
//             url, 
//             domain, 
//             title, 
//             description 
//           });
          
//           console.log("Site categorized:", {
//             domain: meta.domain,
//             category: meta.category,
//             display_name: meta.display_name,
//             confidence: meta.confidence,
//           });
//         } catch (err) {
//           console.warn("Failed to categorize site:", err);
//         }
//       })();
//     }
//   });

//   console.log("Site categorization listener initialized");
// }
