import { initializePromptAPI } from "./ai/main_ai";
// import categorizeSiteByMetadata from "@/components/functions/site_categorizer";

export default defineBackground(() => {
  console.log("=== Background script loaded ===");
  
  initializePromptAPI().then((success) => {
    if (success) {
      console.log("Chrome Prompt API ready");
    } else {
      console.log("Chrome Prompt API not available");
    }
  });

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
        product_price: message.data?.product_price,
        product_discount: message.data?.product_discount,
        product_condition: message.data?.product_condition,
        product_summary: message.data?.product_summary,
        product_pros: message.data?.product_pros,
        product_cons: message.data?.product_cons,
      });
    }
  });
});
