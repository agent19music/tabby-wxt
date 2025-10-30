// This file provides the AI-powered history search functionality
// It uses window.ai.createTextSession() for conversational search

export async function searchHistoryWithAI(query: string) {
  console.log('[AI Search] Starting search for:', query);

  // Get activity logs
  const result = await chrome.storage.local.get('activityLog');
  const activityLog = result.activityLog || [];

  if (activityLog.length === 0) {
    return { error: 'No browsing history available' };
  }

  // Create a search-optimized context (last 100 entries)
  const recentLogs = activityLog.slice(-100);
  const searchContext = recentLogs.map((log: any, index: number) => `
[${index}] ${log.siteDomain} - ${log.summary}
Tags: ${log.tags.join(', ')}
URL: ${log.url}
Visited: ${new Date(log.timestamp).toLocaleString()}
  `).join('\n---\n');

  // Send to offscreen for AI session
  const response = await chrome.runtime.sendMessage({
    type: 'ai-search-session',
    data: { query, searchContext, logs: recentLogs }
  });

  return response;
}

// Add to offscreen.ts:
async function handleAISearchSession(data: { query: string; searchContext: string; logs: any[] }) {
  const session = await window.ai.createTextSession();
  
  const systemPrompt = `You are a browsing history search assistant. The user will describe something they saw while browsing.
Your job is to find the EXACT URL that matches their description.

Here is their recent browsing history:
${data.searchContext}

Return your response as JSON:
{
  "matchIndex": number, // index of the matched entry, or -1 if no match
  "confidence": "high" | "medium" | "low",
  "reasoning": string
}`;

  await session.prompt(systemPrompt);
  const result = await session.prompt(`User query: "${data.query}"`);
  
  console.log('[Offscreen] AI search result:', result);
  
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { error: 'Could not parse AI response' };
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  if (parsed.matchIndex >= 0 && parsed.matchIndex < data.logs.length) {
    return {
      success: true,
      url: data.logs[parsed.matchIndex].url,
      title: data.logs[parsed.matchIndex].summary,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning
    };
  }
  
  return { success: false, message: 'No matching page found' };
}

