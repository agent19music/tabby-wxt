// Chrome AI APIs availability check
export async function checkAIAvailability() {
    console.log('tabby-test: Checking Chrome AI availability');
    
    if (!('ai' in window)) {
      console.error('tabby-test: Chrome AI not available - window.ai not found');
      throw new Error('Chrome AI not available. Use Chrome Dev/Canary with flags enabled.');
    }
    
    console.log('tabby-test: window.ai found, checking capabilities');
    
    const capabilities: any = {};
    
    // Check Language Model
    try {
      // @ts-ignore
      capabilities.languageModel = await window.ai.languageModel.capabilities();
      console.log('tabby-test: Language Model capabilities:', capabilities.languageModel);
    } catch (e) {
      console.warn('tabby-test: Language Model not available:', e);
    }
    
    // Check Summarizer
    try {
      // @ts-ignore
      capabilities.summarizer = await window.ai.summarizer?.capabilities();
      console.log('tabby-test: Summarizer capabilities:', capabilities.summarizer);
    } catch (e) {
      console.warn('tabby-test: Summarizer not available:', e);
    }
    
    // Check Writer (if available)
    try {
      // @ts-ignore
      capabilities.writer = await window.ai.writer?.capabilities();
      console.log('tabby-test: Writer capabilities:', capabilities.writer);
    } catch (e) {
      console.warn('tabby-test: Writer not available:', e);
    }
    
    if (capabilities.languageModel?.available === 'no') {
      console.error('tabby-test: Language Model not available');
      throw new Error('AI model not available');
    }
    
    if (capabilities.languageModel?.available === 'after-download') {
      console.log('tabby-test: AI model downloading - please wait');
    }
    
    return capabilities;
  }
  
  // Create Summarizer session for page content
  export async function createSummarizer() {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Creating Summarizer session');
    
    // Check if AI is available first
    if (!('ai' in window)) {
      console.error('tabby-test: ❌ Chrome AI not available - window.ai not found');
      console.log('tabby-test: ========================================');
      return null;
    }
    
    // @ts-ignore
    if (!window.ai.summarizer) {
      console.warn('tabby-test: ⚠️ Summarizer API not available');
      console.log('tabby-test: ========================================');
      return null;
    }
    
    console.log('tabby-test: ✅ window.ai.summarizer found');
    
    try {
      // @ts-ignore
      const summarizer = await window.ai.summarizer.create({
        type: 'tl;dr', // Summary type
        format: 'plain-text',
        length: 'short'
      });
      
      console.log('tabby-test: ✅ Summarizer created successfully');
      console.log('tabby-test: ========================================');
      return summarizer;
    } catch (e) {
      console.error('tabby-test: ❌ Summarizer creation failed:', e);
      console.log('tabby-test: ========================================');
      return null;
    }
  }

  // Summarize page content for better tag generation
  export async function summarizePageContent(content: string): Promise<string | null> {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: SUMMARIZER API');
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Summarizing page content');
    console.log('tabby-test: Content length:', content.length);
    
    try {
      const summarizer = await createSummarizer();
      if (!summarizer) {
        console.log('tabby-test: ❌ Summarizer not available');
        console.log('tabby-test: ========================================');
        return null;
      }
      
      // Limit content to avoid overwhelming the summarizer
      const truncatedContent = content.slice(0, 3000);
      console.log('tabby-test: Truncated content to:', truncatedContent.length, 'characters');
      console.log('tabby-test: Generating summary...');
      const summary = await summarizer.summarize(truncatedContent);
      
      console.log('tabby-test: ========================================');
      console.log('tabby-test: SUMMARIZER RAW RESPONSE:');
      console.log('tabby-test:', summary);
      console.log('tabby-test: Summary length:', summary.length);
      console.log('tabby-test: ========================================');
      return summary;
    } catch (e) {
      console.error('tabby-test: ❌ Summarization failed:', e);
      console.log('tabby-test: ========================================');
      return null;
    }
  }

  // Create AI Language Model session
  export async function createAISession() {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Creating AI Language Model session');
    
    // Check if AI is available first
    if (!('ai' in window)) {
      console.error('tabby-test: ❌ Chrome AI not available - window.ai not found');
      console.log('tabby-test: ========================================');
      throw new Error('Chrome AI not available. Use Chrome Dev/Canary with flags enabled.');
    }
    
    // @ts-ignore
    if (!window.ai.languageModel) {
      console.error('tabby-test: ❌ Language Model API not found');
      console.log('tabby-test: ========================================');
      throw new Error('Language Model API not available');
    }
    
    console.log('tabby-test: ✅ window.ai.languageModel found');
    
    // @ts-ignore
    const session = await window.ai.languageModel.create({
      systemPrompt: `You are a shopping assistant that analyzes product pages and extracts structured data. 
      Always respond in valid JSON format. Be precise and concise.`
    });
    
    console.log('tabby-test: ✅ AI session created successfully');
    console.log('tabby-test: ========================================');
    return session;
  }

  // Extract product data from page content using AI
  export async function extractProductData(pageContent: string, url: string) {
    console.log('tabby-test: Starting AI product data extraction for:', url);
    
    // First, try to summarize the page for better context
    const summary = await summarizePageContent(pageContent);
    
    const session = await createAISession();
    
    const contentToAnalyze = summary 
      ? `Summary: ${summary}\n\nFull Content: ${pageContent.slice(0, 3000)}`
      : pageContent.slice(0, 5000);
    
    const prompt = `Analyze this product page and extract:
  - Product title (clean, no extra marketing text)
  - Price (numeric value only)
  - Currency
  - Category hierarchy (e.g., ["Electronics", "Audio", "Headphones"])
  - Key specifications (max 5)
  - Brand

  Page URL: ${url}
  Page Content: ${contentToAnalyze}

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

    console.log('tabby-test: Sending prompt to AI Language Model');
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

  // Create semantic search description using Gemini Nano
  export async function generateSearchableDescription(metadata: any, pageContent: string, imageData?: string): Promise<string> {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: GEMINI NANO - SEARCHABLE DESCRIPTION');
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Generating searchable description with Gemini Nano');
    console.log('tabby-test: Input metadata:', JSON.stringify(metadata, null, 2));
    console.log('tabby-test: Page content length:', pageContent.length);
    if (imageData) {
      console.log('tabby-test: Image context provided:', imageData);
    }
    
    try {
      const session = await createAISession();
      
      // Build comprehensive context for AI
      const context = `
WEBPAGE CONTEXT:
Title: ${metadata.title || 'Untitled'}
URL: ${metadata.url || ''}
Keywords: ${metadata.keywords || 'none'}
Description: ${metadata.description || 'none'}
Navigation: ${metadata.navLinks?.join(', ') || 'none'}
Schema Type: ${metadata.schemaTypes?.join(', ') || 'none'}
Content Preview: ${pageContent.slice(0, 1500)}
${imageData ? `Primary Image: ${imageData}` : ''}

Generate a detailed, searchable description (2-3 sentences) that captures:
1. Visual elements (colors, design style, layout)
2. Content type (dashboard, portfolio, product, article, etc.)
3. Key themes and topics
4. Specific memorable details

Make it conversational and descriptive so a user can search for it later using natural language.
Example: "A modern SaaS dashboard with a beautiful blue gradient theme featuring analytics charts and a clean, minimal design. The interface shows revenue metrics and user growth statistics with smooth animations."

SEARCHABLE DESCRIPTION:`;

      console.log('tabby-test: Sending prompt to Gemini Nano...');
      console.log('tabby-test: Prompt length:', context.length);
      const description = await session.prompt(context);
      
      const cleaned = description.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^SEARCHABLE DESCRIPTION:\s*/i, ''); // Remove label if present
      
      console.log('tabby-test: ========================================');
      console.log('tabby-test: GEMINI NANO RAW RESPONSE:');
      console.log('tabby-test:', description);
      console.log('tabby-test: ========================================');
      console.log('tabby-test: CLEANED SEARCHABLE DESCRIPTION:');
      console.log('tabby-test:', cleaned);
      console.log('tabby-test: ========================================');
      return cleaned;
    } catch (e) {
      console.error('tabby-test: ❌ Searchable description generation failed:', e);
      console.log('tabby-test: ========================================');
      // Fallback to basic description
      return metadata.description || metadata.title || 'No description available';
    }
  }

  // Extract and analyze image to enhance context
  export async function analyzePageImage(imageUrl: string): Promise<string | null> {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: IMAGE CONTEXT ANALYSIS');
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Image URL:', imageUrl);
    
    try {
      // For now, extract basic info from image URL
      // Future: Could use Vision API when available
      const url = new URL(imageUrl);
      const filename = url.pathname.split('/').pop() || '';
      const keywords = filename
        .replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '')
        .split(/[-_]/)
        .filter(k => k.length > 2)
        .join(' ');
      
      console.log('tabby-test: Image filename:', filename);
      console.log('tabby-test: Extracted image keywords:', keywords);
      console.log('tabby-test: ========================================');
      return keywords;
    } catch (e) {
      console.error('tabby-test: Image analysis failed:', e);
      console.log('tabby-test: ========================================');
      return null;
    }
  }

  // Generate rich, context-aware tags from all available data
  export async function generateContextualTags(
    metadata: any, 
    pageContent: string,
    searchableDescription: string
  ): Promise<string[]> {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: GEMINI NANO - CONTEXTUAL TAGS');
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Generating contextual tags with Gemini Nano');
    console.log('tabby-test: Metadata:', JSON.stringify(metadata, null, 2));
    console.log('tabby-test: Searchable description:', searchableDescription);
    console.log('tabby-test: Content length:', pageContent.length);
    
    try {
      const session = await createAISession();
      
      const prompt = `Based on this webpage data, extract 8-12 searchable tags that capture key themes, visual style, content type, and memorable details.

Title: ${metadata.title || 'Untitled'}
Keywords: ${metadata.keywords || 'none'}
Description: ${searchableDescription}
Navigation: ${metadata.navLinks?.join(', ') || 'none'}
Content: ${pageContent.slice(0, 800)}

Focus on:
- Visual/design elements (colors, styles, themes)
- Content type (dashboard, portfolio, article, etc.)
- Topics and categories
- Technical stack or tools mentioned
- Memorable unique characteristics

Return ONLY a JSON array of single-word or short-phrase tags.
Example: ["blue-theme", "saas-dashboard", "analytics", "modern-design", "gradient", "revenue-metrics", "fintech"]`;

      console.log('tabby-test: Sending prompt to Gemini Nano...');
      console.log('tabby-test: Prompt length:', prompt.length);
      const result = await session.prompt(prompt);
      console.log('tabby-test: ========================================');
      console.log('tabby-test: GEMINI NANO RAW TAG RESPONSE:');
      console.log('tabby-test:', result);
      console.log('tabby-test: ========================================');
      
      // Parse AI response
      let cleaned = result.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      
      const tags = JSON.parse(cleaned);
      console.log('tabby-test: PARSED TAGS:', tags);
      console.log('tabby-test: Total tags generated:', tags.length);
      console.log('tabby-test: ========================================');
      
      return Array.isArray(tags) ? tags.map(t => String(t).toLowerCase()) : [];
    } catch (e) {
      console.error('tabby-test: ❌ Contextual tag generation failed:', e);
      console.log('tabby-test: ========================================');
      return [];
    }
  }

  // Enhance metadata extraction with AI summarization and searchable descriptions
  export async function enhanceMetadataWithAI(metadata: any, pageContent: string) {
    console.log('tabby-test: ========================================');
    console.log('tabby-test: ✨ STARTING AI METADATA ENHANCEMENT ✨');
    console.log('tabby-test: ========================================');
    console.log('tabby-test: Enhancing metadata with AI for searchable history');
    console.log('tabby-test: Input metadata:', JSON.stringify(metadata, null, 2));
    
    try {
      // Extract image data if available
      let imageContext = null;
      if (metadata.imageUrl) {
        console.log('tabby-test: Image URL found, analyzing...');
        imageContext = await analyzePageImage(metadata.imageUrl);
      }
      
      // Generate rich, searchable description using Gemini Nano
      console.log('tabby-test: Step 1: Generating searchable description...');
      const searchableDescription = await generateSearchableDescription(
        metadata,
        pageContent,
        imageContext || undefined
      );
      
      metadata.searchableDescription = searchableDescription;
      console.log('tabby-test: ✅ Added searchable description for history search');
      
      // Generate contextual tags from all available data
      console.log('tabby-test: Step 2: Generating contextual tags...');
      const contextualTags = await generateContextualTags(
        metadata,
        pageContent,
        searchableDescription
      );
      
      if (contextualTags.length > 0) {
        metadata.aiTags = contextualTags;
        console.log('tabby-test: ✅ Added AI contextual tags:', contextualTags);
      } else {
        console.log('tabby-test: ⚠️ No contextual tags generated');
      }
      
      // Also get a summary if needed
      console.log('tabby-test: Step 3: Generating AI summary...');
      const summary = await summarizePageContent(pageContent);
      if (summary && (!metadata.description || metadata.description.length < 50)) {
        metadata.aiSummary = summary;
        console.log('tabby-test: ✅ Added AI summary');
      } else if (summary) {
        console.log('tabby-test: ℹ️ Summary generated but not used (description already exists)');
      } else {
        console.log('tabby-test: ⚠️ No summary generated');
      }
      
      console.log('tabby-test: ========================================');
      console.log('tabby-test: 🎉 FINAL ENHANCED METADATA:');
      console.log('tabby-test:', JSON.stringify(metadata, null, 2));
      console.log('tabby-test: ========================================');
      
      return metadata;
    } catch (e) {
      console.error('tabby-test: ❌ AI metadata enhancement failed:', e);
      console.log('tabby-test: ========================================');
      return metadata;
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