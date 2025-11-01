// Find related products using Chrome's Prompt API with JSON Schema
import { getAllProducts } from "../db/products_site_storage";
import type { Product } from "../../types/db";

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
 * Helper function to normalize category for comparison
 */
function normalizeCategory(category: string): string {
  return category.toLowerCase().trim().replace(/[_\s-]+/g, '');
}

/**
 * Check if two categories are similar enough
 */
function areCategoriesSimilar(cat1: string, cat2: string): boolean {
  const norm1 = normalizeCategory(cat1);
  const norm2 = normalizeCategory(cat2);
  
  // Exact match
  if (norm1 === norm2) return true;
  
  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Common category patterns
  const commonPatterns = [
    ['electronic', 'tech', 'gadget', 'device'],
    ['clothing', 'fashion', 'apparel', 'wear'],
    ['home', 'kitchen', 'household'],
    ['beauty', 'cosmetic', 'skincare'],
    ['sport', 'fitness', 'athletic'],
    ['book', 'reading', 'literature'],
    ['toy', 'game', 'play'],
  ];
  
  for (const pattern of commonPatterns) {
    const match1 = pattern.some(p => norm1.includes(p));
    const match2 = pattern.some(p => norm2.includes(p));
    if (match1 && match2) return true;
  }
  
  return false;
}

/**
 * Find related products using AI
 */
export async function findRelatedProducts(
  currentProductId: string,
  currentProductTitle: string,
  currentProductCategory: string,
  currentProductSummary: string | undefined,
  allProducts?: Array<{
    id: string;
    title: string;
    category: string;
    summary?: string;
    price?: string;
  }>
): Promise<RecommendationResult> {
  try {
    // Fetch all products if not provided
    if (!allProducts) {
      const storageProducts = await getAllProducts();
      allProducts = storageProducts.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        summary: p.summary,
        price: p.price,
      }));
    }

    // Check if API is available
    if (!('LanguageModel' in self)) {
      throw new Error('Prompt API is not available in this browser');
    }

    const availability = await (window as any).LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new Error('Prompt API is not available on this device');
    }

    // Filter to similar category products - be more flexible!
    const candidateProducts = allProducts.filter(
      (p) => 
        p.id !== currentProductId && 
        p.title && 
        p.category &&
        areCategoriesSimilar(p.category, currentProductCategory)
    );

    console.log(`Filtering products: ${allProducts.length} total, ${candidateProducts.length} in similar category to "${currentProductCategory}"`);

    if (candidateProducts.length === 0) {
      console.log('No products in similar category found, trying with all products...');
      
      // Fallback: use all products except current one
      const fallbackProducts = allProducts.filter(p => p.id !== currentProductId && p.title);
      
      if (fallbackProducts.length === 0) {
        console.log('No other products found at all');
        return { relatedProducts: [], mostRecommended: null };
      }
      
      // Use fallback products but mention in prompt that categories might differ
      return await findRelatedProductsWithAI(
        currentProductId,
        currentProductTitle,
        currentProductCategory,
        currentProductSummary,
        fallbackProducts,
        true // cross-category mode
      );
    }

    return await findRelatedProductsWithAI(
      currentProductId,
      currentProductTitle,
      currentProductCategory,
      currentProductSummary,
      candidateProducts,
      false // same category mode
    );
  } catch (error) {
    console.error('Error finding related products:', error);
    throw error;
  }
}

/**
 * Core AI function for finding related products
 */
async function findRelatedProductsWithAI(
  currentProductId: string,
  currentProductTitle: string,
  currentProductCategory: string,
  currentProductSummary: string | undefined,
  candidateProducts: Array<{
    id: string;
    title: string;
    category: string;
    summary?: string;
    price?: string;
  }>,
  crossCategory: boolean = false
): Promise<RecommendationResult> {
  try {
    // Create session
    const session = await (window as any).LanguageModel.create({
      temperature: 0.3, // Lower temperature for more consistent results
      topK: 3,
    });

    // Define JSON Schema for structured output. Setting additionalProperties to
    // false helps enforce the exact structure and makes model output more
    // predictable when using the Prompt API's structured output feature.
    const schema = {
      type: "object",
      properties: {
        relatedProducts: {
          type: "array",
          maxItems: 5,
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
            required: ["id", "name", "relevanceScore", "reason"],
            additionalProperties: false
          }
        },
        mostRecommended: {
          type: ["object", "null"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            relevanceScore: { type: "number" },
            reason: { type: "string" }
          },
          required: ["id", "name", "relevanceScore", "reason"],
          additionalProperties: false
        }
      },
      required: ["relatedProducts", "mostRecommended"],
      additionalProperties: false
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

   const categoryContext = crossCategory 
     ? `Note: These products may be from different categories since no similar-category products were found.`
     : `All products below are in similar categories to ${currentProductCategory}.`;

   const relevanceThreshold = crossCategory ? 50 : 40; // Lower threshold for better results

   const prompt = `You are a product recommendation expert. Return ONLY a JSON object matching the provided JSON Schema (no extra text, no explanations). Do NOT include the current product. Do NOT repeat the same product more than once.

Current Product:
- ID: ${currentProductId}
- Name: ${currentProductTitle}
- Category: ${currentProductCategory}
- Summary: ${currentProductSummary || 'No summary'}

Other Products:
${categoryContext}
${productsData}

Task:
1) Identify up to 5 products that are MOST similar or complementary to the current product. Consider product type, features, price range, and use case.
2) For each related product provide: id, name, relevanceScore (0-100), and a 1-sentence reason explaining the connection.
3) Return relatedProducts sorted by relevanceScore (highest first). Also include mostRecommended (the single best product) or null.
4) If the top relevanceScore is < ${relevanceThreshold}, return relatedProducts: [] and mostRecommended: null.
5) Be generous with relevance scores for genuinely similar or complementary products.

IMPORTANT: Return a valid JSON object only. Do not include any markdown, commentary or extra text.`;

    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });
    console.log("Raw recommendation result:", result);

    session.destroy();

    // The Prompt API may already return a JS object when using responseConstraint.
    // Handle both string and object returns and defensively parse/validate.
    let parsedRaw: any = result;

    if (typeof result === 'string') {
      try {
        parsedRaw = JSON.parse(result);
      } catch (e) {
        // Try to extract JSON substring if model added surrounding text
        const jsonMatch = result.match(/\{[\s\S]*\}\s*$/);
        if (jsonMatch) {
          try {
            parsedRaw = JSON.parse(jsonMatch[0]);
          } catch (e2) {
            console.warn('Failed to parse JSON from model response', e2);
            return { relatedProducts: [], mostRecommended: null };
          }
        } else {
          console.warn('Model did not return valid JSON', result);
          return { relatedProducts: [], mostRecommended: null };
        }
      }
    }

    // Validate shape
    if (!parsedRaw || typeof parsedRaw !== 'object' || !Array.isArray(parsedRaw.relatedProducts)) {
      console.warn('Unexpected structured output shape', parsedRaw);
      return { relatedProducts: [], mostRecommended: null };
    }

    // Deduplicate, filter out current product, coerce and clamp scores, and sort
    const unique = new Map<string, RelatedProduct>();
    for (const item of parsedRaw.relatedProducts) {
      if (!item || !item.id) continue;
      const id = String(item.id).trim();
      if (!id) continue;
      if (id === currentProductId) continue; // never return the same product
      if (unique.has(id)) continue;
      const name = String(item.name || '').trim();
      const reason = String(item.reason || '').trim();
      const score = Number(item.relevanceScore || 0);
      const clamped = Math.max(0, Math.min(100, Math.round(score)));
      unique.set(id, { id, name, relevanceScore: clamped, reason });
    }

    let relatedProductsArr = Array.from(unique.values()).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);

    // Use the dynamic threshold based on mode
    const threshold = crossCategory ? 50 : 40;
    
    if (relatedProductsArr.length === 0 || relatedProductsArr[0].relevanceScore < threshold) {
      console.log(`Top relevance score ${relatedProductsArr[0]?.relevanceScore || 0} is below threshold ${threshold}`);
      return { relatedProducts: [], mostRecommended: null };
    }

    const mostRecommended = relatedProductsArr[0].relevanceScore >= 70 ? relatedProductsArr[0] : null;

    return { relatedProducts: relatedProductsArr, mostRecommended };
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
