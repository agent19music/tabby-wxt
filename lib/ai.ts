// Check if Chrome AI is available
export async function checkAIAvailability() {
    console.log('tabby-test: Checking Chrome AI availability');
    
    if (!('ai' in window)) {
      console.error('tabby-test: Chrome AI not available - window.ai not found');
      throw new Error('Chrome AI not available. Use Chrome Dev/Canary with flags enabled.');
    }
    
    console.log('tabby-test: window.ai found, checking capabilities');
    
    // @ts-ignore
    const capabilities = await window.ai.languageModel.capabilities();
    
    console.log('tabby-test: AI capabilities:', capabilities);
    
    if (capabilities.available === 'no') {
      console.error('tabby-test: AI model not available');
      throw new Error('AI model not available');
    }
    
    if (capabilities.available === 'after-download') {
      console.log('tabby-test: AI model downloading - please wait');
      // Model needs to download first
    }
    
    return capabilities;
  }
  
  // Create AI session
  export async function createAISession() {
    console.log('tabby-test: Creating AI session');
    
    // @ts-ignore
    const session = await window.ai.languageModel.create({
      systemPrompt: `You are a shopping assistant that analyzes product pages and extracts structured data. 
      Always respond in valid JSON format. Be precise and concise.`
    });
    
    console.log('tabby-test: AI session created successfully');
    return session;
  }
  
  // Extract product data from page content
  export async function extractProductData(pageContent: string, url: string) {
    console.log('tabby-test: Starting product data extraction for:', url);
    
    const session = await createAISession();
    
    const prompt = `Analyze this product page and extract:
  - Product title (clean, no extra marketing text)
  - Price (numeric value only)
  - Currency
  - Category hierarchy (e.g., ["Electronics", "Audio", "Headphones"])
  - Key specifications (max 5)
  - Brand
  
  Page URL: ${url}
  Page Content: ${pageContent.slice(0, 5000)}
  
  Respond ONLY with valid JSON in this format:
  {
    "title": "Product Name",
    "price": 299.99,
    "currency": "USD",
    "category": ["Electronics", "Audio"],
    "specs": ["Spec 1", "Spec 2"],
    "brand": "Brand Name",
    "isProduct": true
  }
  
  If this is NOT a product page, set isProduct to false.`;
  
    console.log('tabby-test: Sending prompt to AI');
    const result = await session.prompt(prompt);
    console.log('tabby-test: AI raw response:', result);
    
    try {
      // Clean up response - remove markdown code blocks if present
      let cleaned = result.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const parsed = JSON.parse(cleaned);
      console.log('tabby-test: Successfully parsed AI response:', parsed);
      return parsed;
    } catch (e) {
      console.error('tabby-test: Failed to parse AI response:', result);
      console.error('tabby-test: Parse error:', e);
      throw new Error('Invalid AI response format');
    }
  }
  
  // Generate product comparison summary
  export async function generateComparison(product: any, visits: any[]) {
    console.log('tabby-test: Generating comparison for product:', product.title);
    
    const session = await createAISession();
    
    const visitSummary = visits.map(v => 
      `${v.site}: ${v.price} ${v.currency} (viewed ${new Date(v.timestamp).toLocaleDateString()})`
    ).join('\n');
    
    const prompt = `Product: ${product.title}
  
  User viewed this product on multiple sites:
  ${visitSummary}
  
  Generate a brief, helpful summary (2-3 sentences) that:
  1. Identifies the best value
  2. Notes any significant price differences
  3. Gives actionable advice
  
  Keep it conversational and user-friendly.`;
  
    console.log('tabby-test: Requesting comparison from AI');
    const result = await session.prompt(prompt);
    console.log('tabby-test: Comparison generated:', result);
    
    return result;
  }