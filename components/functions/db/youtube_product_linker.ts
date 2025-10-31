// Link YouTube reviews to products based on canonical name matching
import { getAllProducts, getProductById, updateProduct } from "./products_site_storage";
import { getAllYoutubeReviews, getYoutubeReviewByVideoId } from "./youtube_storage";
import type { Product, YoutubeReview } from "../db.types";

/**
 * Normalize a canonical name for exact matching
 * - Lowercase
 * - Remove extra spaces
 * - Remove punctuation
 * - Trim
 */
function normalizeCanonicalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Check if two canonical names match
 * Returns true if they're the same after normalization
 * Examples:
 * - "MacBook Pro M4" === "macbook pro m4" ✓
 * - "iPhone 15 Pro" === "iPhone 15 Pro" ✓
 * - "Sony WH-1000XM5" === "sony wh1000xm5" ✓
 */
function canonicalNamesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeCanonicalName(name1);
  const n2 = normalizeCanonicalName(name2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // One contains the other (handles "MacBook Pro M4 Pro" vs "MacBook Pro M4")
  if (n1.includes(n2) || n2.includes(n1)) {
    // Make sure it's not a partial word match
    const words1 = n1.split(' ');
    const words2 = n2.split(' ');
    
    // If one is a subset of the other's words, it's a match
    const allWords2InWords1 = words2.every(w2 => words1.includes(w2));
    const allWords1InWords2 = words1.every(w1 => words2.includes(w1));
    
    return allWords2InWords1 || allWords1InWords2;
  }
  
  return false;
}

/**
 * Link a YouTube review to matching products
 * Returns array of product IDs that were linked
 */
export async function linkYoutubeReviewToProducts(reviewId: string): Promise<string[]> {
  console.log(`[YouTube Linker] 🔗 Linking review ${reviewId} to products...`);
  
  try {
    const reviews = await getAllYoutubeReviews();
    const review = reviews.find(r => r.id === reviewId);
    
    if (!review) {
      console.log(`[YouTube Linker] ⚠️ Review ${reviewId} not found`);
      return [];
    }
    
    console.log(`[YouTube Linker] Review: "${review.video_title}"`);
    console.log(`[YouTube Linker] Type: ${review.review_type}`);
    
    // Get all canonical product names from review
    const reviewCanonicalNames: string[] = [];
    
    if (review.review_type === "single_review" && review.canonical_product_name) {
      reviewCanonicalNames.push(review.canonical_product_name);
      console.log(`[YouTube Linker] Single review canonical name: ${review.canonical_product_name}`);
    } else if ((review.review_type === "versus" || review.review_type === "roundup") && review.products) {
      reviewCanonicalNames.push(...review.products.map(p => p.canonical_product_name));
      console.log(`[YouTube Linker] Comparison canonical names: ${reviewCanonicalNames.join(", ")}`);
    }
    
    if (reviewCanonicalNames.length === 0) {
      console.log(`[YouTube Linker] ⚠️ No canonical names found in review - might be old data`);
      return [];
    }
    
    // Get all stored products
    const allProducts = await getAllProducts();
    console.log(`[YouTube Linker] Checking against ${allProducts.length} stored products`);
    
    const linkedProductIds: string[] = [];
    
    // Find matching products using canonical name matching
    for (const product of allProducts) {
      for (const reviewCanonicalName of reviewCanonicalNames) {
        const isMatch = canonicalNamesMatch(
          product.canonical_name,
          reviewCanonicalName
        );
        
        console.log(`[YouTube Linker] Comparing "${product.canonical_name}" vs "${reviewCanonicalName}": ${isMatch ? '✅ MATCH' : '❌ no match'}`);
        
        if (isMatch) {
          console.log(`[YouTube Linker] ✅ Match found! Linking review to product: ${product.canonical_name}`);
          
          // Add review ID to product's linked reviews
          const linkedReviews = product.linked_review_ids || [];
          if (!linkedReviews.includes(reviewId)) {
            linkedReviews.push(reviewId);
            
            await updateProduct(product.id, {
              linked_review_ids: linkedReviews
            });
            
            linkedProductIds.push(product.id);
            console.log(`[YouTube Linker] Product ${product.id} updated with review link`);
          }
          
          break; // Don't check other review products for this stored product
        }
      }
    }
    
    console.log(`[YouTube Linker] ✅ Linked review to ${linkedProductIds.length} products`);
    return linkedProductIds;
    
  } catch (error) {
    console.error("[YouTube Linker] ❌ Failed to link review to products:", error);
    return [];
  }
}

/**
 * Get all YouTube reviews linked to a product
 */
export async function getLinkedReviewsForProduct(productId: string): Promise<YoutubeReview[]> {
  try {
    console.log(`[YouTube Linker] Fetching linked reviews for product: ${productId}`);
    
    const product = await getProductById(productId);
    if (!product || !product.linked_review_ids || product.linked_review_ids.length === 0) {
      console.log(`[YouTube Linker] No linked reviews found`);
      return [];
    }
    
    const allReviews = await getAllYoutubeReviews();
    const linkedReviews = allReviews.filter(review => 
      product.linked_review_ids!.includes(review.id)
    );
    
    console.log(`[YouTube Linker] Found ${linkedReviews.length} linked reviews`);
    return linkedReviews;
    
  } catch (error) {
    console.error("[YouTube Linker] ❌ Failed to get linked reviews:", error);
    return [];
  }
}

/**
 * Find and link all existing YouTube reviews to products
 * Run this once to link historical data
 */
export async function linkAllExistingReviews(): Promise<number> {
  console.log("[YouTube Linker] 🔗 Linking all existing reviews to products...");
  
  try {
    const reviews = await getAllYoutubeReviews();
    console.log(`[YouTube Linker] Processing ${reviews.length} reviews`);
    
    let totalLinks = 0;
    
    for (const review of reviews) {
      const linkedProducts = await linkYoutubeReviewToProducts(review.id);
      totalLinks += linkedProducts.length;
    }
    
    console.log(`[YouTube Linker] ✅ Created ${totalLinks} total links`);
    return totalLinks;
    
  } catch (error) {
    console.error("[YouTube Linker] ❌ Failed to link existing reviews:", error);
    return 0;
  }
}
