# Tabby Shopping Tracker - Enhanced Features

## 🚀 What's New

Your Tabby extension has been completely upgraded with enterprise-level tracking, analytics, and smart duplicate detection!

## ✨ Key Features Implemented

### 1. **Universal Site Visit Tracking**
- **Every page visit is now indexed** - not just product pages
- Auto-generated tags describe each visit (site name, page type, activity patterns)
- Full browsing history with intelligent categorization

### 2. **Smart Duplicate Detection**
- ✅ Same product on **different sites** = tracked separately (for price comparison)
- ✅ Same product on **same site** = rejected (no duplicates)
- Uses multiple signals:
  - URL matching (exact duplicate check)
  - Image hash comparison
  - Title similarity (85% threshold)
  - Site-specific product tracking

### 3. **Structured Product Categories**
- Max 3-level category hierarchy
- Example: `["Electronics", "Audio", "Headphones"]`
- Auto-normalized and validated
- Full category indexing for filtering and analytics

### 4. **Weekly Analytics Dashboard**
Get insights on your shopping behavior:
- Total visits vs product page visits
- Top sites you browse
- Activity patterns by day of week
- Most viewed products
- Category breakdown
- Tag-based activity analysis

### 5. **Enhanced Database Schema**

#### Products Store (Canonical)
- Deduplicates across all sites
- Tracks view count and site count
- 3-level category system
- Brand tracking

#### Site Products Store
- Site-specific product data
- Price history (last 30 data points)
- Image hash for duplicate detection
- Unique URL constraint

#### Site Visits Store
- Every page visit tracked
- Auto-generated tags
- Product page vs regular page
- Day/time patterns

## 📊 Database Structure

```
Products (Canonical - deduplicated)
├─ id, title, normalizedTitle
├─ category: ["Level1", "Level2", "Level3"]
├─ brand, viewCount, siteCount
└─ firstSeen, lastSeen

Site Products (Per-site product data)
├─ productId (links to canonical)
├─ site, url, title, price, currency
├─ imageUrl, imageHash
├─ priceHistory: [{ price, timestamp }]
└─ firstSeen, lastSeen

Site Visits (All pages)
├─ url, site, domain, title
├─ tags: ["shopping", "product-page", "day-mon", ...]
├─ isProductPage, productId
└─ timestamp
```

## 🎯 Smart Deduplication Logic

### Cross-Site Matching (Same Product, Different Sites)
```
AirPods Max @ Amazon → Product ID: 1
AirPods Max @ B&H    → Product ID: 1 (same canonical product)
                     → BUT different site_products entries
```

### Same-Site Duplicate Rejection
```
AirPods @ Amazon (via /dp/123) → Site Product ID: 10
AirPods @ Amazon (via /dp/123) → REJECTED (same URL)
AirPods @ Amazon (same image)  → REJECTED (same imageHash)
```

## 📈 Analytics Features

Request analytics from any part of the extension:

```javascript
chrome.runtime.sendMessage({ 
  type: 'GET_ANALYTICS' 
}, response => {
  console.log(response.analytics);
});
```

**Returns:**
- Total visits (all pages)
- Product page visits
- Top 10 sites
- Top 15 tags
- Day of week patterns
- Top 10 categories
- Most viewed products (with view counts)

## 🏷️ Auto-Generated Tags

Tags are automatically created for each visit:

**Site-based:**
- `amazon.com`, `bhphotovideo.com`, etc.

**Activity-based:**
- `product-page`, `shopping`, `browsing`, `search`, `deals`

**Category hints:**
- `audio`, `computers`, `photography`, `mobile`, `wearables`, `tv`

**Temporal:**
- `day-mon`, `day-tue`, `day-wed`, etc.

## 🔍 Category Validation

Categories are normalized to max 3 levels:

```javascript
// Input
["Electronics", "Audio", "Headphones", "Wireless", "Noise-Canceling"]

// Stored
["Electronics", "Audio", "Headphones"]
```

## 🛠️ New Message Types

### TRACK_VISIT
Track any page visit (non-product):
```javascript
chrome.runtime.sendMessage({
  type: 'TRACK_VISIT',
  data: { url, site, title }
});
```

### GET_ANALYTICS
Get weekly analytics:
```javascript
chrome.runtime.sendMessage({
  type: 'GET_ANALYTICS'
});
```

## 📝 Logging

All operations use the `tabby-test:` prefix for easy filtering:

```
tabby-test: DB initialized successfully
tabby-test: Tracking page visit: amazon.com
tabby-test: Analyzing page: https://...
tabby-test: Found similar product: 123
tabby-test: Site product already exists, updating price history
tabby-test: Image hash: airpods-max-midnight
tabby-test: Visit tracked with tags
tabby-test: Generating weekly analytics
```

## 🎨 UI Component

New Analytics component created at:
`components/ui/analytics.tsx`

Features:
- Weekly summary cards
- Top sites with progress bars
- Activity by day visualization
- Category tag cloud
- Top tags display
- Most viewed products list

## 🔧 Technical Improvements

1. **IndexedDB v3 Schema** - Backward compatible
2. **Multi-index Support** - Fast queries by category, site, tags
3. **Price History Tracking** - Last 30 price points per site
4. **Smart Similarity Algorithm** - Levenshtein distance with 85% threshold
5. **Image Hash System** - URL-based duplicate detection
6. **TypeScript Interfaces** - Full type safety

## 📱 Usage Example

Visit this product on multiple sites:
```
https://www.bhphotovideo.com/c/product/1852445-REG/apple_mww43am_a_airpods_max_midnight.html
https://www.amazon.com/Apple-AirPods-Max-Midnight/dp/B08PZHYWJS
```

**Result:**
- One canonical product: "Apple AirPods Max"
- Two site_products entries (different prices)
- Two site_visits entries
- Tags: `["bhphotovideo.com", "product-page", "shopping", "audio", "day-sat"]`
- Category: `["Electronics", "Audio", "Headphones"]`

## 🎯 End of Week Analytics

Run this in the console to see your weekly shopping activity:

```javascript
chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' }, r => {
  console.log('Weekly Shopping Summary:', r.analytics);
});
```

You'll get insights like:
- "You visited 47 pages this week"
- "23 were product pages"
- "Most active on Wednesday"
- "Top category: Electronics"
- "Most viewed: Apple AirPods Max (5 times across 2 sites)"

## 🚀 Next Steps

The extension is ready! Here's what to do:

1. **Load in Chrome Canary** (with AI flags enabled)
2. **Browse shopping sites** - every visit is tracked
3. **View products** - smart deduplication in action
4. **Check analytics** - see patterns after a week
5. **Compare prices** - same product across multiple sites

---

**Built with:** IndexedDB, Chrome AI, TypeScript, React, Tailwind CSS
**Status:** ✅ Production Ready
**Database Version:** 3
