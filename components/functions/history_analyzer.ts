import { storage } from "@wxt-dev/storage";
import { SiteCategory } from "../types/enums";
import { SiteMeta, STORAGE_KEYS } from "../types/db";
import { categorizeSiteByMetadata } from "./site_categorizer";

export interface DomainTimeData {
  domain: string;
  timeSpent: number; // in minutes
  visitCount: number;
}

export interface CategoryStats {
  category: SiteCategory;
  timeSpent: number; // in minutes
  visitCount: number;
  label: string;
  fill: string;
  topDomains: DomainTimeData[]; // Top 3 domains by time spent
}

export interface TopSiteByVisits {
  domain: string;
  visitCount: number;
  timeSpent: number; // in minutes
  category: SiteCategory;
}

export interface HistoryAnalysis {
  categoryStats: CategoryStats[];
  topVisitedSites: TopSiteByVisits[];
  totalTimeSpent: number; // in minutes
  totalVisits: number;
  peakHour: number; // 0-23
  mostProductiveCategory: string;
}

const CATEGORY_COLORS: Record<SiteCategory, string> = {
  [SiteCategory.ECOMMERCE]: "#f59e0b", // Blue
  [SiteCategory.MARKETPLACE]: "#60a5fa", // Light Blue
  [SiteCategory.VIDEO]: "#ef4444", // Red
  [SiteCategory.STREAMING]: "#f87171", // Light Red
  [SiteCategory.SOCIAL_MEDIA]: "#a855f7", // Purple
  [SiteCategory.DEVELOPMENT]: "#10b981", // Green
  [SiteCategory.DOCUMENTATION]: "#34d399", // Light Green
  [SiteCategory.NEWS]: "#f59e0b", // Orange
  [SiteCategory.BLOG]: "#fbbf24", // Light Orange
  [SiteCategory.SEARCH_ENGINE]: "#06b6d4", // Cyan
  [SiteCategory.PRODUCTIVITY]: "#14b8a6", // Teal
  [SiteCategory.EDUCATION]: "#8b5cf6", // Violet
  [SiteCategory.GAMING]: "#ec4899", // Pink
  [SiteCategory.EMAIL]: "#6366f1", // Indigo
  [SiteCategory.MESSAGING]: "#818cf8", // Light Indigo
  [SiteCategory.FORUM]: "#f97316", // Deep Orange
  [SiteCategory.MUSIC]: "#d946ef", // Fuchsia
  [SiteCategory.PODCAST]: "#c026d3", // Magenta
  [SiteCategory.DESIGN]: "#06b6d4", // Cyan
  [SiteCategory.BUSINESS]: "#0ea5e9", // Sky Blue
  [SiteCategory.RESEARCH]: "#22c55e", // Lime Green
  [SiteCategory.WIKI]: "#84cc16", // Lime
  [SiteCategory.SPORTS]: "#eab308", // Yellow
  [SiteCategory.NSFW]: "#dc2626", // Dark Red
  [SiteCategory.GAMBLING]: "#be123c", // Rose
  [SiteCategory.FINANCE]: "#059669", // Emerald
  [SiteCategory.HEALTH]: "#16a34a", // Green
  [SiteCategory.TRAVEL]: "#0284c7", // Light Blue
  [SiteCategory.FOOD]: "#ea580c", // Orange Red
  [SiteCategory.WEATHER]: "#0891b2", // Cyan Blue
  [SiteCategory.GOVERNMENT]: "#4f46e5", // Indigo
  [SiteCategory.UNKNOWN]: "#9ca3af", // Gray
};

const CATEGORY_LABELS: Record<SiteCategory, string> = {
  [SiteCategory.ECOMMERCE]: "E-commerce",
  [SiteCategory.MARKETPLACE]: "Marketplace",
  [SiteCategory.VIDEO]: "Video",
  [SiteCategory.STREAMING]: "Streaming",
  [SiteCategory.SOCIAL_MEDIA]: "Social Media",
  [SiteCategory.DEVELOPMENT]: "Development",
  [SiteCategory.DOCUMENTATION]: "Documentation",
  [SiteCategory.NEWS]: "News",
  [SiteCategory.BLOG]: "Blog",
  [SiteCategory.SEARCH_ENGINE]: "Search",
  [SiteCategory.PRODUCTIVITY]: "Productivity",
  [SiteCategory.EDUCATION]: "Education",
  [SiteCategory.GAMING]: "Gaming",
  [SiteCategory.EMAIL]: "Email",
  [SiteCategory.MESSAGING]: "Messaging",
  [SiteCategory.FORUM]: "Forum",
  [SiteCategory.MUSIC]: "Music",
  [SiteCategory.PODCAST]: "Podcast",
  [SiteCategory.DESIGN]: "Design",
  [SiteCategory.BUSINESS]: "Business",
  [SiteCategory.RESEARCH]: "Research",
  [SiteCategory.WIKI]: "Wiki",
  [SiteCategory.SPORTS]: "Sports",
  [SiteCategory.NSFW]: "NSFW",
  [SiteCategory.GAMBLING]: "Gambling",
  [SiteCategory.FINANCE]: "Finance",
  [SiteCategory.HEALTH]: "Health",
  [SiteCategory.TRAVEL]: "Travel",
  [SiteCategory.FOOD]: "Food",
  [SiteCategory.WEATHER]: "Weather",
  [SiteCategory.GOVERNMENT]: "Government",
  [SiteCategory.UNKNOWN]: "Unknown",
};

function normalizeDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].toLowerCase();
  }
}

async function getSiteMetas(): Promise<Record<string, SiteMeta>> {
  const key = (`local:${STORAGE_KEYS.SITE_METAS}` as unknown) as `local:${string}`;
  const cached = (await storage.getItem(key)) as Record<string, SiteMeta> | null;
  return cached || {};
}

async function getCategoryForDomain(domain: string, url: string): Promise<SiteCategory> {
  const metas = await getSiteMetas();
  const cached = metas[domain];
  
  if (cached) {
    console.log(`[History Analyzer] Using cached category for ${domain}:`, cached.category);
    return cached.category;
  }
  
  // Not cached, categorize it
  console.log(`[History Analyzer] Categorizing new domain: ${domain}`);
  const meta = await categorizeSiteByMetadata({ url, domain });
  return meta.category;
}

export async function analyzeWeeklyHistory(): Promise<HistoryAnalysis> {
  console.log("[History Analyzer] Starting weekly history analysis");
  
  // Get history from the past week
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  const historyItems = await chrome.history.search({
    text: "",
    startTime: oneWeekAgo,
    maxResults: 10000,
  });
  
  console.log(`[History Analyzer] Found ${historyItems.length} history items`);
  
  // Track time spent and visits by category and domain
  const categoryData: Map<SiteCategory, { timeSpent: number; visitCount: number; domains: Map<string, DomainTimeData> }> = new Map();
  const domainVisits: Map<string, TopSiteByVisits> = new Map();
  const hourlyVisits: Map<number, number> = new Map();
  
  let totalVisits = 0;
  
  // Process each history item and get detailed visit info
  for (const item of historyItems) {
    if (!item.url) continue;
    
    const domain = normalizeDomain(item.url);
    const category = await getCategoryForDomain(domain, item.url);
    
    // Get visit details for time calculation
    const visits = await chrome.history.getVisits({ url: item.url });
    
    let itemTimeSpent = 0;
    let itemVisitCount = visits.length;
    totalVisits += itemVisitCount;
    
    // Estimate time spent based on visit transitions
    // Assume average of 2 minutes per visit if no transition info
    for (let i = 0; i < visits.length; i++) {
      const visit = visits[i];
      if (!visit.visitTime) continue;
      
      const visitTime = new Date(visit.visitTime);
      const hour = visitTime.getHours();
      hourlyVisits.set(hour, (hourlyVisits.get(hour) || 0) + 1);
      
      if (i < visits.length - 1) {
        const nextVisit = visits[i + 1];
        if (nextVisit.visitTime) {
          const timeDiff = (nextVisit.visitTime - visit.visitTime) / (1000 * 60); // minutes
          // Cap at 30 minutes per visit to avoid skewing data
          itemTimeSpent += Math.min(timeDiff, 30);
        }
      } else {
        // Last visit, assume 2 minutes
        itemTimeSpent += 2;
      }
    }
    
    // Update category data
    if (!categoryData.has(category)) {
      categoryData.set(category, { timeSpent: 0, visitCount: 0, domains: new Map() });
    }
    const catData = categoryData.get(category)!;
    catData.timeSpent += itemTimeSpent;
    catData.visitCount += itemVisitCount;
    
    // Update domain data within category
    if (!catData.domains.has(domain)) {
      catData.domains.set(domain, { domain, timeSpent: 0, visitCount: 0 });
    }
    const domainData = catData.domains.get(domain)!;
    domainData.timeSpent += itemTimeSpent;
    domainData.visitCount += itemVisitCount;
    
    // Update global domain visits
    if (!domainVisits.has(domain)) {
      domainVisits.set(domain, { domain, visitCount: 0, timeSpent: 0, category });
    }
    const globalDomain = domainVisits.get(domain)!;
    globalDomain.visitCount += itemVisitCount;
    globalDomain.timeSpent += itemTimeSpent;
  }
  
  console.log("[History Analyzer] Category breakdown:", Object.fromEntries(categoryData));
  
  // Find peak hour
  let peakHour = 0;
  let maxHourVisits = 0;
  hourlyVisits.forEach((count, hour) => {
    if (count > maxHourVisits) {
      maxHourVisits = count;
      peakHour = hour;
    }
  });
  
  // Convert to CategoryStats array
  const categoryStats: CategoryStats[] = Array.from(categoryData.entries())
    .map(([category, data]) => {
      // Get top 3 domains by time spent
      const topDomains = Array.from(data.domains.values())
        .sort((a, b) => b.timeSpent - a.timeSpent)
        .slice(0, 3);
      
      return {
        category,
        timeSpent: data.timeSpent,
        visitCount: data.visitCount,
        label: CATEGORY_LABELS[category],
        fill: CATEGORY_COLORS[category],
        topDomains,
      };
    })
    .filter(stat => stat.category !== SiteCategory.UNKNOWN && stat.timeSpent > 0)
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, 10); // Top 10 categories by time spent
  
  // Get top 3 most visited sites
  const topVisitedSites = Array.from(domainVisits.values())
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, 3);
  
  // Calculate total time spent
  const totalTimeSpent = categoryStats.reduce((sum, stat) => sum + stat.timeSpent, 0);
  
  // Find most productive category (Development, Productivity, Education, Documentation, Research)
  const productiveCategories = [
    SiteCategory.DEVELOPMENT,
    SiteCategory.PRODUCTIVITY,
    SiteCategory.EDUCATION,
    SiteCategory.DOCUMENTATION,
    SiteCategory.RESEARCH,
  ];
  const productiveStat = categoryStats
    .filter(s => productiveCategories.includes(s.category))
    .sort((a, b) => b.timeSpent - a.timeSpent)[0];
  
  const analysis: HistoryAnalysis = {
    categoryStats,
    topVisitedSites,
    totalTimeSpent,
    totalVisits,
    peakHour,
    mostProductiveCategory: productiveStat?.label || "None",
  };
  
  console.log("[History Analyzer] Analysis complete:", analysis);
  
  return analysis;
}
