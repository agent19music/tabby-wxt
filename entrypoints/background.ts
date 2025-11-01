import { initializePromptAPI } from "./ai/main_ai";
import { initializeSiteCategorization } from "./background/site_categorization";
import { linkYoutubeReviewToProducts } from "@/components/functions/db/youtube_product_linker";

export default defineBackground(() => {
  console.log("=== Background script loaded ===");
  
  initializePromptAPI().then((success) => {
    if (success) {
      console.log("Chrome Prompt API ready");
    } else {
      console.log("Chrome Prompt API not available");
    }
  });

  // Initialize site categorization listener
  initializeSiteCategorization();

  chrome.runtime.onInstalled.addListener(async () => {
    console.log("Extension installed/updated");
    try {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
      console.log("Side panel behavior set successfully");
    } catch (error) {
      console.error("Error setting side panel behavior:", error);
    }
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    console.log("=== Background received message ===", {
      action: message?.action,
      hasSender: !!sender,
      hasTab: !!sender?.tab,
      tabId: sender?.tab?.id,
    });
    
    if (message?.action === "pageContentExtracted" && sender.tab?.id) {
      console.log("Auto extracted page content from tab", sender.tab.id, {
        title: message.data?.title,
        url: message.data?.url,
        contentLength: message.data?.content?.length,
        imagesCount: message.data?.images?.length,
        summary: message.data?.summary,
        tags: message.data?.tags,
        is_product: message.data?.is_product,
        worth_storing: message.data?.worth_storing,
        product_price: message.data?.product_price,
        product_discount: message.data?.product_discount,
        product_condition: message.data?.product_condition,
        product_summary: message.data?.product_summary,
        product_pros: message.data?.product_pros,
        product_cons: message.data?.product_cons,
      });
    }
    
    // Auto-link YouTube reviews to products
    if (message?.action === "youtubeReviewDetected" && message?.data) {
      console.log("[Background] 🔗 YouTube review detected, attempting to link to products...");
      
      (async () => {
        try {
          // The review was already saved in content script, we have the full data
          const reviewData = message.data;
          
          // We need the review ID to link it - let's get it from storage by video_id
          const { getYoutubeReviewByVideoId } = await import("@/components/functions/db/youtube_storage");
          const savedReview = await getYoutubeReviewByVideoId(reviewData.videoData.video_id);
          
          if (savedReview) {
            console.log(`[Background] Found saved review with ID: ${savedReview.id}`);
            const linkedProductIds = await linkYoutubeReviewToProducts(savedReview.id);
            console.log(`[Background] ✅ Linked review to ${linkedProductIds.length} products`);
            
            if (linkedProductIds.length > 0) {
              console.log(`[Background] Linked product IDs:`, linkedProductIds);
            }
          } else {
            console.log("[Background] ⚠️ Could not find saved review to link");
          }
        } catch (error) {
          console.error("[Background] ❌ Failed to link YouTube review:", error);
        }
      })();
    }
  });
});
