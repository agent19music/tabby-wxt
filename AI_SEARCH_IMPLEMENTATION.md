# AI-Powered Searchable History Implementation

## Overview
This extension now features **natural language search** powered by Chrome's on-device AI (Gemini Nano). Users can search their browsing history using conversational queries like:

> "last week I saw a beautiful blue theme SaaS dashboard design inspiration"

The system uses AI to generate rich, searchable descriptions of every page visited, enabling semantic search without sending data to external servers.

---

## Architecture

### 1. **Data Flow**

```
Page Visit → Content Script → Background Script → AI Processing → Database Storage
                                                         ↓
User Search Query → Search Algorithm → Ranked Results → Display
```

### 2. **AI Pipeline (lib/ai.ts)**

#### **Summarizer API**
- Creates concise page summaries (tl;dr format)
- Used for quick context extraction
- Example: "A modern SaaS analytics dashboard with real-time metrics and beautiful visualizations"

#### **Language Model API (Gemini Nano)**
- Generates searchable descriptions combining:
  - Page content (first 2000 chars)
  - Meta keywords and description
  - Visual elements (from images)
  - Page structure (navigation, headings)
  
- Extracts contextual tags:
  ```javascript
  generateContextualTags(content, metadata, imageContext)
  // Returns: ["blue-theme", "saas-dashboard", "analytics", "modern-design"]
  ```

#### **Image Analysis**
- Analyzes first 3 images on the page
- Extracts: colors, subjects, composition
- Feeds into searchable description
- Example: "blue gradient background, chart visualizations, modern UI elements"

### 3. **Database Schema (lib/db.ts)**

#### **SiteVisit Interface**
```typescript
interface SiteVisit {
  id?: number;
  url: string;
  site: string;           // Domain
  domain: string;         // Clean domain
  title: string;
  tags: string[];         // AI-generated tags
  searchableDescription?: string;  // AI-generated natural language description
  isProductPage: boolean;
  productId?: number;
  timestamp: number;
}
```

#### **Indexes**
- `by_timestamp`: For date-based queries
- `by_site`: For filtering by domain
- `by_domain`: For aggregation

### 4. **Search Algorithm**

```typescript
searchSiteVisits(query: string, options?: {
  since?: number;  // Default: last 30 days
  limit?: number;  // Default: 50 results
})
```

#### **Scoring System**
1. **Text Match** (+1 per occurrence): Searches across:
   - `searchableDescription`
   - `tags`
   - `title`
   - `url`

2. **Tag Boost** (+3): Exact or partial tag matches get higher weight
3. **Description Boost** (+2): Matches in AI-generated descriptions rank higher
4. **Temporal Sort**: Equal scores sorted by newest first

#### **Query Processing**
- Splits query into terms (removes words < 3 chars)
- Case-insensitive matching
- Regex-based for partial matches
- Example query: "blue theme saas dashboard"
  - Terms: `["blue", "theme", "saas", "dashboard"]`
  - Each term scored independently

---

## Usage Examples

### **Search from Sidepanel**
```typescript
// User types: "design inspiration blue gradient"
chrome.runtime.sendMessage({
  type: 'SEARCH_HISTORY',
  data: {
    query: 'design inspiration blue gradient',
    limit: 20  // Return top 20 results
  }
});

// Response:
{
  success: true,
  results: [
    {
      title: "Dribble - Dashboard Designs",
      searchableDescription: "A collection of modern SaaS dashboard designs featuring blue gradient themes, clean layouts, and inspiring UI patterns",
      tags: ["design-inspiration", "blue-gradient", "saas-ui", "modern"],
      url: "https://dribbble.com/shots/123456",
      timestamp: 1704067200000
    },
    // ... more results
  ]
}
```

### **Time-Based Queries**
```typescript
// Search last week only
const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

chrome.runtime.sendMessage({
  type: 'SEARCH_HISTORY',
  data: {
    query: 'blue dashboard',
    since: weekAgo
  }
});
```

---

## AI Enhancement Process

### **Content Script (entrypoints/content.ts)**
```typescript
// Extracts comprehensive metadata
function extractMetadata() {
  // 1. Meta tags
  const keywords = document.querySelector('meta[name="keywords"]')?.content;
  const description = document.querySelector('meta[name="description"]')?.content;
  
  // 2. Schema.org data
  const schemaScript = document.querySelector('script[type="application/ld+json"]');
  
  // 3. Navigation structure
  const navLinks = Array.from(document.querySelectorAll('nav a'));
  
  // 4. First 3 images
  const images = Array.from(document.querySelectorAll('img'))
    .slice(0, 3)
    .map(img => img.src);
    
  // 5. Page content (2000 chars)
  const content = document.body.innerText.slice(0, 2000);
  
  return { keywords, description, schema, navLinks, images, content };
}
```

### **Background Processing (entrypoints/background.ts)**
```typescript
async function handleTrackVisit(data) {
  // Enhance metadata with AI
  const metadata = await enhanceMetadataWithAI(data.metadata, data.content);
  
  // metadata now includes:
  // - searchableDescription: "A comprehensive..."
  // - tags: ["design", "inspiration", "blue-theme"]
  // - summary: "This page showcases..."
  
  // Store in database
  await db.addSiteVisit({
    url: data.url,
    site: data.site,
    title: data.title,
    isProductPage: false,
    metadata  // Contains searchableDescription
  });
}
```

---

## Example AI Output

### **Input**
- **URL**: `https://dribbble.com/shots/analytics-dashboard`
- **Title**: "Analytics Dashboard - Modern SaaS Design"
- **Meta Description**: "A beautiful analytics dashboard with clean metrics and visualizations"
- **Keywords**: "dashboard, analytics, saas, blue theme, modern design"
- **Content**: "Explore this modern analytics dashboard featuring... real-time metrics... beautiful charts..."
- **Images**: `[dashboard-screenshot.png, chart-detail.png]`

### **AI-Generated Output**
```javascript
{
  searchableDescription: "A modern SaaS analytics dashboard showcasing real-time metrics with a beautiful blue gradient theme. Features clean data visualizations, intuitive charts, and a minimal design aesthetic perfect for design inspiration.",
  
  tags: [
    "analytics-dashboard",
    "saas-design",
    "blue-theme",
    "data-visualization",
    "modern-ui",
    "design-inspiration",
    "real-time-metrics",
    "clean-design"
  ],
  
  summary: "Modern analytics dashboard with blue theme and clean visualizations"
}
```

### **Search Queries That Would Match**
- ✅ "blue dashboard design"
- ✅ "saas analytics inspiration"
- ✅ "modern data visualization"
- ✅ "clean metrics dashboard"
- ✅ "real-time analytics ui"

---

## Performance Considerations

### **On-Device AI Benefits**
1. **Privacy**: No data leaves the browser
2. **Speed**: Near-instant processing (no network latency)
3. **Offline**: Works without internet connection
4. **Cost**: No API fees

### **Database Optimization**
- **Indexed by timestamp**: Fast date range queries
- **Cursor-based iteration**: Efficient for large datasets
- **Score-first sorting**: Best results first
- **Configurable limits**: Prevents overwhelming UI

### **Search Optimization**
- **Term filtering**: Ignores short words (< 3 chars)
- **Early termination**: Stops at limit
- **Batched processing**: Uses IndexedDB cursors
- **In-memory scoring**: Fast comparison

---

## Future Enhancements

### **Potential Improvements**
1. **Semantic Embeddings**: Use AI to generate vector embeddings for true semantic search
2. **Query Understanding**: AI-powered query expansion (synonyms, related terms)
3. **Personalization**: Learn user preferences over time
4. **Multi-language**: Support non-English content
5. **Image Search**: "Find pages with blue color schemes"
6. **Timeline View**: Visual calendar of browsing history
7. **Clusters**: Auto-group related pages (e.g., "Research on React frameworks")

---

## Testing the Feature

### **1. Build and Load Extension**
```powershell
pnpm run dev
# Load unpacked extension from .output/chrome-mv3
```

### **2. Visit Some Pages**
Visit diverse websites (design portfolios, SaaS dashboards, documentation sites)

### **3. Open Sidepanel**
Click extension icon → Open sidepanel

### **4. Try Natural Language Search**
```
Query: "blue theme dashboard"
Query: "documentation react"
Query: "design inspiration modern"
```

### **5. Check Console Logs**
```javascript
// Console will show:
// tabby-test: Enhancing metadata with AI...
// tabby-test: Generated searchable description: "A modern..."
// tabby-test: Generated tags: ["design", "modern", ...]
// tabby-test: Site visit recorded with ID: 1
// tabby-test: Search results for: "blue dashboard" found: 3
```

---

## API Reference

### **Database Methods**

```typescript
// Add a site visit with AI-enhanced metadata
await db.addSiteVisit({
  url: string,
  site: string,
  title: string,
  isProductPage: boolean,
  metadata?: {
    searchableDescription?: string,
    tags?: string[],
    // ... other metadata
  }
});

// Search site visits
const results = await db.searchSiteVisits(
  'blue dashboard design',
  {
    since: Date.now() - 7 * 24 * 60 * 60 * 1000,  // Last week
    limit: 20
  }
);
```

### **AI Methods**

```typescript
// Generate searchable description
const description = await generateSearchableDescription(
  'Page content...',
  {
    keywords: 'design, modern',
    description: 'A beautiful dashboard',
    images: ['url1', 'url2']
  }
);

// Generate contextual tags
const tags = await generateContextualTags(
  'Content...',
  metadata,
  'blue gradient, charts'  // Image analysis
);

// Enhance metadata with all AI features
const enhanced = await enhanceMetadataWithAI(
  originalMetadata,
  pageContent
);
```

### **Message Protocol**

```typescript
// Search history
chrome.runtime.sendMessage({
  type: 'SEARCH_HISTORY',
  data: {
    query: string,
    since?: number,
    limit?: number
  }
});
// Returns: { success: boolean, results: SiteVisit[], error?: string }
```

---

## Troubleshooting

### **AI Not Working**
1. Check Chrome version (needs >= 127 with AI flags enabled)
2. Verify `chrome.ai.summarizer` and `chrome.ai.languageModel` are available
3. Check console for AI initialization errors

### **No Search Results**
1. Visit some pages first to populate database
2. Check if searchableDescription is being saved (console logs)
3. Try simpler queries (single words)

### **Slow Performance**
1. Reduce search limit
2. Use more specific queries (more terms = better filtering)
3. Clear old data (database can grow large)

---

## Summary

This implementation creates a **privacy-first, AI-powered browsing history** that understands context and intent. By using Chrome's on-device AI, we can:

1. 🧠 **Understand** page content deeply
2. 🏷️ **Tag** pages with relevant keywords
3. 📝 **Describe** pages in natural language
4. 🔍 **Search** using conversational queries
5. 🔒 **Protect** user privacy (all on-device)

The result is a browsing history that works like a smart assistant, letting users find that "beautiful blue dashboard I saw last week" without remembering the exact site or URL.
