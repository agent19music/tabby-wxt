// Chrome Storage API for Site Visits and Natural Language Search
import type { SiteVisit, SearchResult } from "../db.types";
import { STORAGE_KEYS, STORAGE_LIMITS } from "../db.types";

/**
 * Get all site visits from storage
 */
export async function getAllSiteVisits(): Promise<SiteVisit[]> {
  try {
    console.log("[Site Visits Storage] Fetching all site visits...");
    const result = await chrome.storage.local.get(STORAGE_KEYS.SITE_VISITS);
    const visitsArray = (result[STORAGE_KEYS.SITE_VISITS] as SiteVisit[]) || [];
    console.log(`[Site Visits Storage] Retrieved ${visitsArray.length} visits from storage`);
    return visitsArray;
  } catch (error) {
    console.error("[Site Visits Storage] ❌ Failed to get site visits:", error);
    return [];
  }
}

/**
 * Get recent site visits (last N visits)
 */
export async function getRecentSiteVisits(limit: number = STORAGE_LIMITS.RECENT_VISITS_FOR_SEARCH): Promise<SiteVisit[]> {
  try {
    const allVisits = await getAllSiteVisits();
    // Sort by timestamp (newest first) and limit
    return allVisits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  } catch (error) {
    console.error("[Site Visits Storage] ❌ Failed to get recent site visits:", error);
    return [];
  }
}

/**
 * Search site visits using natural language with AI
 */
export async function searchSiteVisitsWithAI(query: string): Promise<SearchResult[]> {
  console.log("[Site Visits Search] 🔍 Starting natural language search...");
  console.log(`[Site Visits Search] Query: "${query}"`);
  
  if (!query || query.trim().length === 0) {
    console.log("[Site Visits Search] Empty query, returning empty results");
    return [];
  }

  try {
    // Get recent visits to search through
    const recentVisits = await getRecentSiteVisits();
    console.log(`[Site Visits Search] Searching through ${recentVisits.length} recent visits`);
    
    if (recentVisits.length === 0) {
      console.log("[Site Visits Search] No visits in storage");
      return [];
    }

    // Check if AI is available
    if (typeof LanguageModel === "undefined") {
      console.log("[Site Visits Search] ⚠️ LanguageModel not available, falling back to keyword search");
      return fallbackKeywordSearch(query, recentVisits);
    }

    const availability = await LanguageModel.availability();
    if (availability.available === "no") {
      console.log("[Site Visits Search] ⚠️ LanguageModel not available, falling back to keyword search");
      return fallbackKeywordSearch(query, recentVisits);
    }

    console.log("[Site Visits Search] Creating AI session...");
    const session = await LanguageModel.create({
      temperature: 0.3,
      topK: 3,
    });

    const schema = {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              visit_index: {
                type: "number",
                description: "Index of the visit in the provided array"
              },
              relevance_score: {
                type: "number",
                description: "Relevance score 0-100. High (80+) = highly relevant, Medium (50-79) = somewhat relevant, Low (<50) = not relevant"
              },
              match_reason: {
                type: "string",
                description: "Brief explanation why this page matches the query"
              }
            },
            required: ["visit_index", "relevance_score", "match_reason"]
          }
        }
      },
      required: ["results"]
    };

    // Build visit descriptions for AI analysis (limit to prevent token overflow)
    const visitsToAnalyze = recentVisits.slice(0, 50); // Analyze top 50 most recent
    const visitDescriptions = visitsToAnalyze.map((visit, index) => {
      return `[${index}] ${visit.title}
URL: ${visit.url}
Summary: ${visit.summary || 'No summary'}
Tags: ${visit.tags.join(', ') || 'None'}`;
    }).join('\n\n');

    const prompt = `Analyze these web pages and determine which ones are relevant to the user's search query.

User Query: "${query}"

Web Pages:
${visitDescriptions}

SCORING RULES:
- HIGH RELEVANCE (80-100): Page content directly addresses the query (exact topic match)
- MEDIUM RELEVANCE (50-79): Page is related but not exactly what user wants (tangential topic)
- LOW RELEVANCE (0-49): Page is unrelated to the query

MATCHING CRITERIA:
- Compare query against page title, summary, and tags
- Consider semantic meaning (e.g., "react hooks" matches pages about "useState", "useEffect")
- Consider synonyms and related concepts
- Natural language understanding (e.g., "how to code" matches "programming tutorials")

Return ONLY pages with relevance_score >= 40. For each relevant page, explain why it matches.
If no pages are relevant, return an empty results array.`;

    console.log("[Site Visits Search] Sending query to AI...");
    const result = await session.prompt(prompt, {
      responseConstraint: schema,
    });

    session.destroy();
    console.log("[Site Visits Search] ✅ AI analysis complete");

    const parsed = JSON.parse(result);
    
    // Map results back to SiteVisits
    const searchResults: SearchResult[] = parsed.results
      .filter((r: any) => r.relevance_score >= 40) // Only keep relevant results
      .map((r: any) => {
        const visit = visitsToAnalyze[r.visit_index];
        if (!visit) return null;
        
        console.log(`[Site Visits Search] Result: "${visit.title}" - Score: ${r.relevance_score}`);
        console.log(`[Site Visits Search]   Reason: ${r.match_reason}`);
        
        return {
          visit,
          relevance_score: r.relevance_score,
          match_reason: r.match_reason
        };
      })
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.relevance_score - a.relevance_score) // Sort by score
      .slice(0, STORAGE_LIMITS.MAX_SEARCH_RESULTS); // Limit results

    console.log(`[Site Visits Search] ✅ Returning ${searchResults.length} results`);
    return searchResults;

  } catch (error) {
    console.error("[Site Visits Search] ❌ Search failed:", error);
    console.error("[Site Visits Search] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Fallback to keyword search on error
    const recentVisits = await getRecentSiteVisits();
    return fallbackKeywordSearch(query, recentVisits);
  }
}

/**
 * Fallback keyword-based search when AI is unavailable
 */
function fallbackKeywordSearch(query: string, visits: SiteVisit[]): SearchResult[] {
  console.log("[Site Visits Search] Using fallback keyword search...");
  
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  
  const results: SearchResult[] = visits
    .map(visit => {
      const searchText = [
        visit.title,
        visit.summary,
        visit.tags.join(' '),
        visit.url
      ].join(' ').toLowerCase();
      
      // Count matching words
      const matchCount = queryWords.filter(word => searchText.includes(word)).length;
      const relevance_score = matchCount > 0 ? Math.min(100, (matchCount / queryWords.length) * 100) : 0;
      
      if (relevance_score >= 40) {
        return {
          visit,
          relevance_score: Math.round(relevance_score),
          match_reason: `Keyword match (${matchCount}/${queryWords.length} words)`
        };
      }
      return null;
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, STORAGE_LIMITS.MAX_SEARCH_RESULTS);
  
  console.log(`[Site Visits Search] Fallback search found ${results.length} results`);
  return results;
}

/**
 * Get site visit statistics
 */
export async function getSiteVisitStats(): Promise<{
  totalVisits: number;
  byCategory: Record<string, number>;
  recentCount: number;
}> {
  try {
    const visits = await getAllSiteVisits();
    const byCategory: Record<string, number> = {};
    
    for (const visit of visits) {
      const category = visit.site_category;
      byCategory[category] = (byCategory[category] || 0) + 1;
    }
    
    return {
      totalVisits: visits.length,
      byCategory,
      recentCount: visits.filter(v => Date.now() - v.timestamp < 7 * 24 * 60 * 60 * 1000).length
    };
  } catch (error) {
    console.error("Failed to get site visit stats:", error);
    return {
      totalVisits: 0,
      byCategory: {},
      recentCount: 0
    };
  }
}
