export default defineContentScript({
    matches: ['<all_urls>'],
    
    async main() {
      // Known shopping sites with selectors
      const SITE_SELECTORS = {
        'amazon.com': {
          title: '#productTitle',
          price: '.a-price-whole',
          image: '#landingImage'
        },
        'ebay.com': {
          title: '.x-item-title__mainTitle',
          price: '.x-price-primary',
          image: '.ux-image-carousel-item img'
        },
        'bhphotovideo.com': {
          title: '[data-selenium="productTitle"]',
          price: '[data-selenium="pricePrimary"]',
          image: '[data-selenium="heroImage"]'
        }
        // Add more as needed
      };
  
      // Detect if current page is a product page
      async function detectAndExtractProduct() {
        const hostname = window.location.hostname;
        const url = window.location.href;
        
        console.log('tabby-test: Checking URL:', url);
        
        // Quick check - does URL look like a product?
        const productUrlPatterns = [
          /\/dp\/[A-Z0-9]+/i,  // Amazon
          /\/itm\//i,           // eBay
          /\/product\//i,       // Generic
          /\/p\//i,             // Generic
          /\/c\/product\//i     // B&H Photo Video
        ];
        
        const looksLikeProduct = productUrlPatterns.some(pattern => pattern.test(url));
        
        if (!looksLikeProduct) {
          console.log('tabby-test: URL does not match product pattern');
          return;
        }
        
        console.log('tabby-test: Potential product page detected');
        
        // Try known selectors first
        let productData = null;
        
        for (const [site, selectors] of Object.entries(SITE_SELECTORS)) {
          if (hostname.includes(site)) {
            console.log('tabby-test: Trying selectors for', site);
            productData = await extractWithSelectors(selectors);
            if (productData) {
              productData.site = site;
              console.log('tabby-test: Extracted with selectors:', productData);
              break;
            }
          }
        }
        
        // Fallback to AI extraction
        if (!productData) {
          console.log('tabby-test: Falling back to Chrome AI extraction');
          const pageContent = document.body.innerText;
          
          console.log('tabby-test: Page content length:', pageContent.length);
          
          // Send to background script for AI processing
          const response = await chrome.runtime.sendMessage({
            type: 'ANALYZE_PAGE',
            data: {
              url,
              content: pageContent,
              hostname
            }
          });
          
          console.log('tabby-test: AI response:', response);
          productData = response.product;
        }
        
        if (productData && productData.isProduct !== false) {
          console.log('tabby-test: Saving product data');
          // Send to background for storage
          await chrome.runtime.sendMessage({
            type: 'SAVE_PRODUCT',
            data: productData
          });
          
          // Show subtle notification
          showNotification(productData.title);
        } else {
          console.log('tabby-test: Not a product page or extraction failed');
        }
      }
      
      function extractWithSelectors(selectors: any) {
        try {
          const title = document.querySelector(selectors.title)?.textContent?.trim();
          const priceText = document.querySelector(selectors.price)?.textContent?.trim();
          const imageUrl = (document.querySelector(selectors.image) as HTMLImageElement)?.src;
          
          if (!title || !priceText) return null;
          
          // Parse price
          const priceMatch = priceText.match(/[\d,]+\.?\d*/);
          const price = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : null;
          
          return {
            title,
            price,
            currency: 'USD', // Detect from page if possible
            imageUrl,
            url: window.location.href,
            timestamp: Date.now(),
            isProduct: true
          };
        } catch (e) {
          return null;
        }
      }
      
      function showNotification(productName: string) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #000;
          color: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 999999;
          font-family: system-ui;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = `🛍️ Tracked: ${productName.slice(0, 40)}...`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
      }
      
      // Run detection after page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectAndExtractProduct);
      } else {
        detectAndExtractProduct();
      }
    }
  });