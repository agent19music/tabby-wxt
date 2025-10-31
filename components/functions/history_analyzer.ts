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

export interface WeekComparison {
  currentWeek: HistoryAnalysis;
  previousWeek: HistoryAnalysis;
  changes: {
    timeSpentChange: number; // percentage
    visitsChange: number; // percentage
    productivityChange: number; // percentage
    topGrowingCategory: string;
    topDecliningCategory: string;
  };
}

const CATEGORY_COLORS: Record<SiteCategory, string> = {
  [SiteCategory.NEWS]: "#0a84ff",
  [SiteCategory.BLOG]: "#5e5ce6",
  [SiteCategory.SOCIAL_MEDIA]: "#bf5af2",
  [SiteCategory.VIDEO]: "#ff375f",
  [SiteCategory.MUSIC]: "#ff9f0a",
  [SiteCategory.PODCAST]: "#ac8e68",
  [SiteCategory.ECOMMERCE]: "#30d158",
  [SiteCategory.MARKETPLACE]: "#32d74b",
  [SiteCategory.PRODUCTIVITY]: "#64d2ff",
  [SiteCategory.DEVELOPMENT]: "#5ac8fa",
  [SiteCategory.DESIGN]: "#af52de",
  [SiteCategory.BUSINESS]: "#ffd60a",
  [SiteCategory.EDUCATION]: "#0a84ff",
  [SiteCategory.DOCUMENTATION]: "#30d158",
  [SiteCategory.RESEARCH]: "#5e5ce6",
  [SiteCategory.WIKI]: "#64d2ff",
  [SiteCategory.GAMING]: "#ff453a",
  [SiteCategory.STREAMING]: "#ff375f",
  [SiteCategory.SPORTS]: "#ff9f0a",
  [SiteCategory.EMAIL]: "#0a84ff",
  [SiteCategory.MESSAGING]: "#30d158",
  [SiteCategory.FORUM]: "#5ac8fa",
  [SiteCategory.NSFW]: "#ff3b30",
  [SiteCategory.GAMBLING]: "#ff453a",
  [SiteCategory.SEARCH_ENGINE]: "#aeaeb2",
  [SiteCategory.FINANCE]: "#30d158",
  [SiteCategory.HEALTH]: "#ff375f",
  [SiteCategory.TRAVEL]: "#64d2ff",
  [SiteCategory.FOOD]: "#ff9f0a",
  [SiteCategory.WEATHER]: "#5ac8fa",
  [SiteCategory.GOVERNMENT]: "#aeaeb2",
  [SiteCategory.UNKNOWN]: "#48484a",
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

async function analyzeHistoryForPeriod(startTime: number, endTime: number): Promise<HistoryAnalysis> {
  console.log(`[History Analyzer] Analyzing history from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);
  
  const periodDays = (endTime - startTime) / (24 * 60 * 60 * 1000);
  
  const historyItems = await chrome.history.search({
    text: "",
    startTime: startTime,
    endTime: endTime,
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

export async function analyzeWeeklyHistory(): Promise<HistoryAnalysis> {
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  return analyzeHistoryForPeriod(oneWeekAgo, now);
}

export async function compareWeeks(): Promise<WeekComparison> {
  console.log("[History Analyzer] Starting week-over-week comparison");
  
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;
  
  const [currentWeek, previousWeek] = await Promise.all([
    analyzeHistoryForPeriod(oneWeekAgo, now),
    analyzeHistoryForPeriod(twoWeeksAgo, oneWeekAgo),
  ]);
  
  // Calculate changes
  const timeSpentChange = previousWeek.totalTimeSpent > 0
    ? ((currentWeek.totalTimeSpent - previousWeek.totalTimeSpent) / previousWeek.totalTimeSpent) * 100
    : 0;
  
  const visitsChange = previousWeek.totalVisits > 0
    ? ((currentWeek.totalVisits - previousWeek.totalVisits) / previousWeek.totalVisits) * 100
    : 0;
  
  // Calculate productivity change
  const productiveCategories = ["Development", "Productivity", "Education", "Documentation", "Research"];
  
  const currentProductiveTime = currentWeek.categoryStats
    .filter(s => productiveCategories.includes(s.label))
    .reduce((sum, s) => sum + s.timeSpent, 0);
  const currentProductivity = currentWeek.totalTimeSpent > 0 ? (currentProductiveTime / currentWeek.totalTimeSpent) * 100 : 0;
  
  const previousProductiveTime = previousWeek.categoryStats
    .filter(s => productiveCategories.includes(s.label))
    .reduce((sum, s) => sum + s.timeSpent, 0);
  const previousProductivity = previousWeek.totalTimeSpent > 0 ? (previousProductiveTime / previousWeek.totalTimeSpent) * 100 : 0;
  
  const productivityChange = currentProductivity - previousProductivity;
  
  // Find top growing and declining categories
  const categoryChanges = new Map<string, number>();
  
  currentWeek.categoryStats.forEach(current => {
    const previous = previousWeek.categoryStats.find(p => p.category === current.category);
    if (previous && previous.timeSpent > 0) {
      const change = ((current.timeSpent - previous.timeSpent) / previous.timeSpent) * 100;
      categoryChanges.set(current.label, change);
    } else if (!previous && current.timeSpent > 0) {
      categoryChanges.set(current.label, 100); // New category
    }
  });
  
  const sortedChanges = Array.from(categoryChanges.entries()).sort((a, b) => b[1] - a[1]);
  const topGrowingCategory = sortedChanges[0]?.[0] || "None";
  const topDecliningCategory = sortedChanges[sortedChanges.length - 1]?.[0] || "None";
  
  return {
    currentWeek,
    previousWeek,
    changes: {
      timeSpentChange,
      visitsChange,
      productivityChange,
      topGrowingCategory,
      topDecliningCategory,
    },
  };
}
