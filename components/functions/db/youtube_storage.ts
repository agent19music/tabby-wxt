// Chrome Storage API for YouTube reviews
import type { YoutubeReview } from "../db.types";
import { STORAGE_KEYS, STORAGE_LIMITS } from "../db.types";

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get all YouTube reviews from storage
 */
export async function getAllYoutubeReviews(): Promise<YoutubeReview[]> {
  try {
    console.log("[YouTube Storage] Fetching all YouTube reviews...");
    const result = await chrome.storage.local.get(STORAGE_KEYS.YOUTUBE_REVIEWS);
    const reviewsArray = (result[STORAGE_KEYS.YOUTUBE_REVIEWS] as YoutubeReview[]) || [];
    console.log(`[YouTube Storage] Retrieved ${reviewsArray.length} reviews from storage`);
    console.log("[YouTube Storage] Reviews data:", reviewsArray);
    return reviewsArray;
  } catch (error) {
    console.error("[YouTube Storage] ❌ Failed to get YouTube reviews:", error);
    return [];
  }
}

/**
 * Get YouTube review by video ID
 */
export async function getYoutubeReviewByVideoId(videoId: string): Promise<YoutubeReview | null> {
  try {
    console.log(`[YouTube Storage] Looking for review with video ID: ${videoId}`);
    const reviews = await getAllYoutubeReviews();
    const found = reviews.find(r => r.video_id === videoId) || null;
    console.log(`[YouTube Storage] Found review:`, found ? "YES" : "NO");
    return found;
  } catch (error) {
    console.error(`[YouTube Storage] ❌ Failed to get YouTube review by video ID ${videoId}:`, error);
    return null;
  }
}

/**
 * Save or update a YouTube review
 */
export async function saveYoutubeReview(review: Omit<YoutubeReview, "id" | "first_seen">): Promise<string> {
  try {
    console.log("[YouTube Storage] 💾 Attempting to save YouTube review:", {
      video_id: review.video_id,
      video_title: review.video_title,
      product_name: review.product_name,
      product_category: review.product_category,
      overall_sentiment: review.overall_sentiment
    });
    
    let reviewsArray = await getAllYoutubeReviews();
    console.log(`[YouTube Storage] Current review count: ${reviewsArray.length}`);
    
    // Check if review already exists for this video
    const existingIndex = reviewsArray.findIndex(r => r.video_id === review.video_id);
    console.log(`[YouTube Storage] Existing review index: ${existingIndex}`);
    
    if (existingIndex >= 0) {
      // Update existing review
      const existingReview = reviewsArray[existingIndex];
      console.log(`[YouTube Storage] Updating existing review with ID: ${existingReview.id}`);
      reviewsArray[existingIndex] = {
        ...existingReview,
        ...review,
        watched_at: Date.now(), // Update watched_at
      };
      console.log(`[YouTube Storage] ✅ Updated existing YouTube review for video: ${review.video_id}`);
      await chrome.storage.local.set({ [STORAGE_KEYS.YOUTUBE_REVIEWS]: reviewsArray });
      console.log("[YouTube Storage] Storage updated successfully");
      return existingReview.id;
    } else {
      // Create new review
      const newReviewId = generateUUID();
      const newReview: YoutubeReview = {
        id: newReviewId,
        ...review,
        first_seen: Date.now(),
      };
      
      console.log(`[YouTube Storage] Creating new review with ID: ${newReviewId}`);
      reviewsArray.push(newReview);
      
      // Sort by watched_at (newest first) and limit size
      reviewsArray.sort((a, b) => b.watched_at - a.watched_at);
      const originalLength = reviewsArray.length;
      if (reviewsArray.length > STORAGE_LIMITS.MAX_YOUTUBE_REVIEWS) {
        reviewsArray = reviewsArray.slice(0, STORAGE_LIMITS.MAX_YOUTUBE_REVIEWS);
        console.log(`[YouTube Storage] Trimmed reviews from ${originalLength} to ${STORAGE_LIMITS.MAX_YOUTUBE_REVIEWS}`);
      }
      
      await chrome.storage.local.set({ [STORAGE_KEYS.YOUTUBE_REVIEWS]: reviewsArray });
      console.log(`[YouTube Storage] ✅ Saved new YouTube review for video: ${review.video_id}`);
      console.log(`[YouTube Storage] Total reviews now: ${reviewsArray.length}`);
      return newReview.id;
    }
  } catch (error) {
    console.error("[YouTube Storage] ❌ Failed to save YouTube review:", error);
    console.error("[YouTube Storage] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Get YouTube reviews by category
 */
export async function getYoutubeReviewsByCategory(category: string): Promise<YoutubeReview[]> {
  try {
    const reviews = await getAllYoutubeReviews();
    return reviews.filter(r => r.product_category === category);
  } catch (error) {
    console.error("Failed to get YouTube reviews by category:", error);
    return [];
  }
}

/**
 * Get YouTube reviews by sentiment
 */
export async function getYoutubeReviewsBySentiment(
  sentiment: "positive" | "neutral" | "negative"
): Promise<YoutubeReview[]> {
  try {
    const reviews = await getAllYoutubeReviews();
    return reviews.filter(r => r.overall_sentiment === sentiment);
  } catch (error) {
    console.error("Failed to get YouTube reviews by sentiment:", error);
    return [];
  }
}

/**
 * Delete a YouTube review by ID
 */
export async function deleteYoutubeReview(reviewId: string): Promise<boolean> {
  try {
    let reviewsArray = await getAllYoutubeReviews();
    const initialLength = reviewsArray.length;
    
    reviewsArray = reviewsArray.filter(r => r.id !== reviewId);
    
    if (reviewsArray.length < initialLength) {
      await chrome.storage.local.set({ [STORAGE_KEYS.YOUTUBE_REVIEWS]: reviewsArray });
      console.log(`✅ Deleted YouTube review: ${reviewId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Failed to delete YouTube review:", error);
    return false;
  }
}

/**
 * Clear all YouTube reviews
 */
export async function clearAllYoutubeReviews(): Promise<void> {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.YOUTUBE_REVIEWS);
    console.log("✅ All YouTube reviews cleared");
  } catch (error) {
    console.error("Failed to clear YouTube reviews:", error);
    throw error;
  }
}

/**
 * Get YouTube review statistics
 */
export async function getYoutubeReviewStats(): Promise<{
  totalReviews: number;
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
}> {
  try {
    const reviews = await getAllYoutubeReviews();
    
    const byCategory: Record<string, number> = {};
    const bySentiment: Record<string, number> = {};
    
    for (const review of reviews) {
      // Count by category
      byCategory[review.product_category] = (byCategory[review.product_category] || 0) + 1;
      
      // Count by sentiment
      bySentiment[review.overall_sentiment] = (bySentiment[review.overall_sentiment] || 0) + 1;
    }
    
    return {
      totalReviews: reviews.length,
      byCategory,
      bySentiment,
    };
  } catch (error) {
    console.error("Failed to get YouTube review stats:", error);
    return {
      totalReviews: 0,
      byCategory: {},
      bySentiment: {},
    };
  }
}
