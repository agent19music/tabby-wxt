export default defineContentScript({
    matches: ['<all_urls>'],

    async main() {
      // Check Chrome AI availability on load
      console.log('tabby-test: ========================================');
      console.log('tabby-test: 🤖 CHECKING CHROME AI CAPABILITIES');
      console.log('tabby-test: ========================================');
      
      try {
        const { checkAIAvailability } = await import('@/lib/ai');
        const capabilities = await checkAIAvailability();
        console.log('tabby-test: ✅ Chrome AI is available!');
        console.log('tabby-test: Full capabilities:', JSON.stringify(capabilities, null, 2));
        console.log('tabby-test: ========================================');
      } catch (error: any) {
        console.error('tabby-test: ❌ Chrome AI initialization failed:', error);
        console.error('tabby-test: Make sure you are using Chrome Dev/Canary with AI flags enabled');
        console.log('tabby-test: ========================================');
      }

      // Track page visit on load
      trackPageVisit();

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
        
        // Fallback to AI extraction (happens in content script where window.ai exists)
        if (!productData) {
          console.log('tabby-test: Falling back to Chrome AI extraction');
          const pageContent = document.body.innerText;
          
          console.log('tabby-test: Page content length:', pageContent.length);
          
          try {
            // Import and use AI directly in content script
            const { extractProductData } = await import('@/lib/ai');
            const aiResult = await extractProductData(pageContent, url);
            
            console.log('tabby-test: AI extraction result:', aiResult);
            productData = aiResult;
          } catch (aiError) {
            console.error('tabby-test: AI extraction failed:', aiError);
            return; // Skip this page
          }
        }
        
        if (productData && productData.isProduct !== false) {
          console.log('tabby-test: Saving product data');
          
          // Extract metadata for better tagging
          const metadata = extractMetadata();
          
          // Send to background for storage
          await chrome.runtime.sendMessage({
            type: 'SAVE_PRODUCT',
            data: {
              ...productData,
              metadata
            }
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
            isProduct: true,
            site: '' // Will be set by caller
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

      // Extract comprehensive metadata from page
      function extractMetadata() {
        console.log('tabby-test: ========================================');
        console.log('tabby-test: 📋 EXTRACTING PAGE METADATA');
        console.log('tabby-test: ========================================');
        console.log('tabby-test: URL:', window.location.href);
        console.log('tabby-test: Title:', document.title);
        
        const metadata: any = {
          title: document.title,
          url: window.location.href,
          keywords: '',
          description: '',
          ogType: '',
          category: '',
          navLinks: [],
          schemaTypes: [],
          imageUrl: ''
        };
        
        // Meta tags
        const metaTags = document.querySelectorAll('meta');
        console.log('tabby-test: Found', metaTags.length, 'meta tags');
        
        metaTags.forEach(tag => {
          const name = tag.getAttribute('name') || tag.getAttribute('property') || '';
          const content = tag.getAttribute('content') || '';
          
          // Keywords
          if (name.toLowerCase().includes('keywords')) {
            metadata.keywords = content;
            console.log('tabby-test: Keywords:', content);
          }
          
          // Description
          if (name.toLowerCase().includes('description')) {
            metadata.description = content;
            console.log('tabby-test: Description:', content);
          }
          
          // OpenGraph type
          if (name === 'og:type') {
            metadata.ogType = content;
            console.log('tabby-test: OG Type:', content);
          }
          
          // OpenGraph image
          if (name === 'og:image') {
            metadata.imageUrl = content;
            console.log('tabby-test: OG Image:', content);
          }
          
          // Category hints
          if (name.toLowerCase().includes('category') || name.toLowerCase().includes('section')) {
            metadata.category = content;
            console.log('tabby-test: Category:', content);
          }
        });
        
        // Extract navigation links (header/nav)
        const navElements = document.querySelectorAll('header nav a, nav a, [role="navigation"] a, .nav a, .navigation a, .menu a');
        const navLinks: string[] = [];
        navElements.forEach(link => {
          const text = (link as HTMLElement).textContent?.trim();
          if (text && text.length > 0 && text.length < 30) {
            navLinks.push(text);
          }
        });
        metadata.navLinks = [...new Set(navLinks)].slice(0, 15); // Max 15 unique nav links
        console.log('tabby-test: Nav links extracted:', metadata.navLinks.length, 'links -', metadata.navLinks);
        
        // Schema.org structured data
        const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
        const schemaTypes: string[] = [];
        console.log('tabby-test: Found', schemaScripts.length, 'schema.org scripts');
        
        schemaScripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '{}');
            if (data['@type']) {
              const type = Array.isArray(data['@type']) ? data['@type'][0] : data['@type'];
              schemaTypes.push(type);
              console.log('tabby-test: Schema type:', type);
            }
            // Handle arrays of schema objects
            if (Array.isArray(data)) {
              data.forEach(item => {
                if (item['@type']) {
                  schemaTypes.push(item['@type']);
                  console.log('tabby-test: Schema type (array):', item['@type']);
                }
              });
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
        metadata.schemaTypes = [...new Set(schemaTypes)];
        
        // Extract main content headings for additional context
        const h1 = document.querySelector('h1')?.textContent?.trim() || '';
        if (h1 && !metadata.description) {
          metadata.description = h1;
          console.log('tabby-test: Using H1 as description:', h1);
        }
        
        // Check for common site identifiers
        const bodyClasses = document.body.className;
        if (bodyClasses.includes('woocommerce') || bodyClasses.includes('shopify')) {
          metadata.category = 'ecommerce';
          console.log('tabby-test: Detected ecommerce platform');
        }
        
        console.log('tabby-test: ========================================');
        console.log('tabby-test: 📊 FINAL EXTRACTED METADATA:');
        console.log('tabby-test:', JSON.stringify(metadata, null, 2));
        console.log('tabby-test: ========================================');
        return metadata;
      }

      // Track all page visits for analytics
      async function trackPageVisit() {
        const url = window.location.href;
        const site = window.location.hostname;
        const title = document.title;
        
        // Don't track internal browser pages
        if (url.startsWith('chrome://') || url.startsWith('about:')) {
          return;
        }
        
        console.log('tabby-test: Tracking page visit:', site);
        
        // Extract metadata
        const metadata = extractMetadata();
        
        // Get page content for AI enhancement
        const pageContent = document.body.innerText.slice(0, 2000); // First 2000 chars
        
        // Enhance metadata with AI (happens in content script where window.ai exists)
        let enhancedMetadata = metadata;
        try {
          console.log('tabby-test: Enhancing metadata with AI in content script...');
          const { enhanceMetadataWithAI } = await import('@/lib/ai');
          enhancedMetadata = await enhanceMetadataWithAI(metadata, pageContent);
        } catch (aiError) {
          console.warn('tabby-test: AI enhancement failed, using basic metadata:', aiError);
        }
        
        try {
          await chrome.runtime.sendMessage({
            type: 'TRACK_VISIT',
            data: { 
              url, 
              site, 
              title, 
              metadata: enhancedMetadata // Send AI-enhanced metadata
            }
          });
        } catch (error) {
          console.log('tabby-test: Visit tracking skipped (extension context)');
        }
      }
      
      // Run detection after page load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectAndExtractProduct);
      } else {
        detectAndExtractProduct();
      }
    }
  });