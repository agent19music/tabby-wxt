// Find related products using Chrome's Prompt API with JSON Schema

export interface RelatedProduct {
  id: string;
  name: string;
  relevanceScore: number; // 0-100
  reason: string;
}

export interface RecommendationResult {
  relatedProducts: RelatedProduct[];
  mostRecommended: RelatedProduct | null;
}

/**
 * Find related products using AI
 */
export async function findRelatedProducts(
  currentProductId: string,
  currentProductTitle: string,
  currentProductCategory: string,
  currentProductSummary: string | undefined,
  allProducts: Array<{
    id: string;
    title: string;
    category: string;
    summary?: string;
    price?: string;
  }>
): Promise<RecommendationResult> {
  try {
    // Check if API is available
    if (!('LanguageModel' in self)) {
      throw new Error('Prompt API is not available in this browser');
    }

    const availability = await (window as any).LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new Error('Prompt API is not available on this device');
    }

    // Filter to ONLY products in the same category - be strict!
    const candidateProducts = allProducts.filter(
      (p) => 
        p.id !== currentProductId && 
        p.title && 
        p.category &&
        p.category.toLowerCase() === currentProductCategory.toLowerCase()
    );

    console.log(`Filtering products: ${allProducts.length} total, ${candidateProducts.length} in same category (${currentProductCategory})`);

    if (candidateProducts.length === 0) {
      console.log('No products in same category found');
      return { relatedProducts: [], mostRecommended: null };
    }

    // Create session
    const session = await (window as any).LanguageModel.create({
      temperature: 0.3, // Lower temperature for more consistent results
      topK: 3,
    });

    // Define JSON Schema for structured output
    const schema = {
      type: "object",
      properties: {
        relatedProducts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              relevanceScore: { 
                type: "number",
                minimum: 0,
                maximum: 100
              },
              reason: { type: "string" }
            },
            required: ["id", "name", "relevanceScore", "reason"]
          }
        },
        mostRecommended: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            relevanceScore: { type: "number" },
            reason: { type: "string" }
          },
          required: ["id", "name", "relevanceScore", "reason"]
        }
      },
      required: ["relatedProducts", "mostRecommended"]
    };

    // Create prompt
    const productsData = candidateProducts
      .map(
        (p, i) =>
          `${i + 1}. ID: ${p.id}
   Name: ${p.title}
   Category: ${p.category}
   Price: ${p.price || 'N/A'}
   Summary: ${p.summary || 'No summary'}`
      )
      .join('\n\n');

    const prompt = `You are a product recommendation expert. Analyze the following current product and list of other products IN THE SAME CATEGORY, then determine which products are most related and recommend the best one.

IMPORTANT: All products listed below are in the SAME category (${currentProductCategory}). Focus on finding the most similar or comparable products.

Current Product:
Name: ${currentProductTitle}
Category: ${currentProductCategory}
Summary: ${currentProductSummary || 'No summary'}

Other Products (ALL in ${currentProductCategory} category):
${productsData}

Task:
1. Identify products that are MOST similar to the current product based on:
   - Same product type (e.g., if current is headphones, only recommend headphones)
   - Similar features and specifications
   - Comparable price range
   - Similar quality level or brand positioning
   
2. For each related product, provide:
   - Product ID (exactly as shown above)
   - Product name (exactly as shown above)
   - Relevance score (0-100, where 100 is most similar/comparable)
   - Brief reason why it's related (1 sentence)

3. Select the MOST recommended product that:
   - Is VERY similar to the current product (same type)
   - Could be a direct alternative or upgrade
   - Has high relevance score (80+)

STRICT RULES:
- Only recommend products of the EXACT SAME TYPE (e.g., headphones with headphones, not headphones with speakers)
- Relevance score must be based on actual similarity
- If no products are truly similar (all score < 60), return empty arrays
- Return up to 5 most related products, sorted by relevance score (highest first)`;

    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });
    console.log("Raw recommendation result:", result);

    session.destroy();

    // Parse the JSON response
    const parsedResult: RecommendationResult = JSON.parse(result);

    return parsedResult;
  } catch (error) {
    console.error('Error finding related products:', error);
    throw error;
  }
}

/**
 * Get simple product comparison
 */
export async function compareProducts(
  product1: { title: string; category: string; price?: string; summary?: string },
  product2: { title: string; category: string; price?: string; summary?: string }
): Promise<string> {
  try {
    if (!('LanguageModel' in self)) {
      throw new Error('Prompt API is not available');
    }

    const session = await (window as any).LanguageModel.create({
      temperature: 0.5,
      topK: 3,
    });

    const prompt = `Compare these two products and provide a brief comparison (2-3 sentences):

Product 1:
- Name: ${product1.title}
- Category: ${product1.category}
- Price: ${product1.price || 'N/A'}
- Summary: ${product1.summary || 'No summary'}

Product 2:
- Name: ${product2.title}
- Category: ${product2.category}
- Price: ${product2.price || 'N/A'}
- Summary: ${product2.summary || 'No summary'}

Focus on key differences in features, price, and which product might be better for different use cases.`;

    const result = await session.prompt(prompt);
    session.destroy();

    return result;
  } catch (error) {
    console.error('Error comparing products:', error);
    throw error;
  }
}
