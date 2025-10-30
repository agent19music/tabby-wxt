export async function getWeeklyStats() {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  // Get browsing history
  const historyItems = await chrome.history.search({
    text: '',
    startTime: oneWeekAgo,
    maxResults: 10000
  });

  // Get site categories
  const stored = await chrome.storage.local.get('siteCategories');
  const siteCategories = stored.siteCategories || {};

  // Count by category
  const categoryCounts: Record<string, number> = {};
  
  for (const item of historyItems) {
    if (!item.url) continue;
    const domain = new URL(item.url).hostname;
    const category = siteCategories[domain]?.category || 'Uncategorized';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }

  console.log('[Stats] Weekly category breakdown:', categoryCounts);
  
  return {
    totalVisits: historyItems.length,
    categoryCounts,
    topCategories: Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
  };
}