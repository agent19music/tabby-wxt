import { db } from '@/lib/db';
import { extractProductData, generateComparison } from '@/lib/ai';

export default defineBackground(() => {
  // Initialize DB on install
  chrome.runtime.onInstalled.addListener(async () => {
    await db.init();
    console.log('tabby-test: DB initialized');
  });

  // Handle messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYZE_PAGE') {
      handleAnalyzePage(message.data).then(sendResponse);
      return true; // Keep channel open for async response
    }
    
    if (message.type === 'SAVE_PRODUCT') {
      handleSaveProduct(message.data).then(sendResponse);
      return true;
    }
  });

  async function handleAnalyzePage(data: any) {
    try {
      console.log('tabby-test: Analyzing page:', data.url);
      console.log('tabby-test: Page content length:', data.content?.length || 0);
      
      const product = await extractProductData(data.content, data.url);
      
      console.log('tabby-test: Extracted product data:', {
        title: product.title,
        price: product.price,
        currency: product.currency,
        brand: product.brand,
        isProduct: product.isProduct
      });
      
      return { success: true, product };
    } catch (error) {
      console.error('tabby-test: AI analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  async function handleSaveProduct(productData: any) {
    try {
      console.log('tabby-test: Saving product:', productData.title);
      
      // Normalize title for matching
      const normalizedTitle = productData.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();
      
      console.log('tabby-test: Normalized title:', normalizedTitle);
      
      // Check if we've seen similar product
      const existingProducts = await db.getAllProducts();
      const similarProduct = existingProducts.find((p: any) => {
        const similarity = calculateSimilarity(p.normalizedTitle, normalizedTitle);
        return similarity > 0.8; // 80% similarity threshold
      });
      
      let productId;
      
      if (similarProduct) {
        console.log('tabby-test: Found similar product:', similarProduct.id);
        productId = similarProduct.id;
      } else {
        // New product
        productId = await db.addProduct({
          ...productData,
          normalizedTitle,
          firstSeen: Date.now()
        });
        console.log('tabby-test: Created new product:', productId);
      }
      
      // Always add visit
      const site = productData.site || new URL(productData.url).hostname;
      await db.addVisit({
        productId,
        url: productData.url,
        site,
        price: productData.price,
        currency: productData.currency,
        timestamp: Date.now()
      });
      
      console.log('tabby-test: Visit saved for site:', site);
      
      return { success: true, productId };
    } catch (error) {
      console.error('tabby-test: Save failed:', error);
      return { success: false, error: error.message };
    }
  }

  function calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
});