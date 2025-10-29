# 🤖 Chrome On-Device AI Integration

## Overview

Tabby uses **multiple Chrome on-device AI APIs** to provide intelligent product tracking and page analysis without sending any data to the cloud. Everything happens locally on your device!

## AI APIs Used

### 1. **Summarizer API** ✨ (NEW!)
**Purpose:** Generate concise summaries of page content for better understanding and tagging

**Used In:**
- Page visit tracking
- Tag generation
- Metadata enhancement

**Example:**
```javascript
// Automatically summarizes any page you visit
const summary = await summarizePageContent(pageContent);
// Returns: "This page showcases UI design work including mobile apps and websites"
```

**Benefits:**
- Understand page content quickly
- Extract key themes automatically
- Better tag generation from summaries
- Works offline

---

### 2. **Language Model API (Prompt API)** 🧠
**Purpose:** Structured data extraction and intelligent analysis

**Used In:**
- **Product data extraction** - Parse product pages to extract title, price, specs, category
- **AI tag generation** - Generate smart tags from page summaries
- **Product comparisons** - Analyze multiple listings and recommend best deals

**Examples:**

#### Product Extraction
```javascript
const product = await extractProductData(pageContent, url);
// Returns: {
//   title: "Apple AirPods Max",
//   price: 549.99,
//   currency: "USD",
//   category: ["Electronics", "Audio", "Headphones"],
//   brand: "Apple",
//   specs: ["Active Noise Cancellation", "Spatial Audio", "20-hour battery"]
// }
```

#### Smart Tag Generation
```javascript
const tags = await generateSmartTags(pageContent, metadata);
// Returns: ["design", "creative", "portfolio", "ui", "web"]
```

#### Product Comparison
```javascript
const comparison = await generateComparison(product, visits);
// Returns: "Amazon offers the best price at $499. B&H Photo is $50 more. 
//          Amazon has free shipping. Buy from Amazon."
```

---

## Complete AI Flow

### When You Visit Any Page:

```
1. Content Script extracts page content (2000 chars)
   ↓
2. Sends to Background Script
   ↓
3. SUMMARIZER API summarizes content
   ↓
4. LANGUAGE MODEL API generates tags from summary
   ↓
5. Tags stored: ["ai-design", "ai-portfolio", "creative", "nav-work"]
   ↓
6. Analytics uses AI tags for insights
```

### When You Visit a Product Page:

```
1. Content Script detects product URL pattern
   ↓
2. Extracts page content (5000 chars)
   ↓
3. SUMMARIZER API creates summary
   ↓
4. LANGUAGE MODEL API extracts structured data
   ↓
5. Product saved with AI-extracted category
   ↓
6. Price tracked for comparison
   ↓
7. LANGUAGE MODEL API generates comparison (if multiple sites)
```

---

## AI-Enhanced Features

### 1. **Smart Tags** (Prefix: `ai-`)
Every page gets AI-analyzed tags:
```javascript
// Dribbble visit
tags: [
  'dribbble.com',
  'ai-design',      // ← AI detected from summary
  'ai-creative',    // ← AI detected from summary
  'ai-portfolio',   // ← AI detected from summary
  'design',         // ← From meta tags
  'nav-shots',      // ← From navigation
  'day-tue'
]
```

### 2. **Auto Category Detection**
Products get AI-assigned categories:
```javascript
// AI analyzes: "Wireless noise-canceling headphones with premium sound"
category: ["Electronics", "Audio", "Headphones"]
```

### 3. **AI Summaries**
Pages without good meta descriptions get AI summaries:
```javascript
metadata: {
  description: "",  // Empty from meta tags
  aiSummary: "Portfolio showcasing mobile app designs and UI/UX work" // ← AI-generated
}
```

### 4. **Intelligent Comparisons**
```javascript
// You view AirPods on 3 sites
// AI analyzes all prices and details:
"Best deal is Amazon at $499 (10% off). B&H has same price but charges shipping.
Apple Store is full price at $549. Recommend: Buy from Amazon."
```

---

## AI Capabilities Check

On startup, the extension checks all available AI features:

```javascript
const capabilities = await checkAIAvailability();
console.log(capabilities);

// Example output:
{
  languageModel: { available: "readily", defaultTemperature: 0.8 },
  summarizer: { available: "readily" },
  writer: { available: "after-download" }
}
```

---

## Privacy & Performance

### ✅ **100% On-Device**
- No data sent to cloud
- All AI runs locally
- Works offline
- No API keys needed

### ✅ **Smart Caching**
- AI sessions are reused
- Summaries cached per page
- Minimal resource usage

### ✅ **Graceful Degradation**
- If Summarizer unavailable → falls back to meta tags
- If Language Model unavailable → uses DOM selectors
- Never fails completely

---

## Example Logs

### Page Visit with AI Enhancement
```
tabby-test: Tracking page visit: dribbble.com
tabby-test: Enhancing metadata with AI...
tabby-test: Creating Summarizer session
tabby-test: Summarizer created successfully
tabby-test: Page summary generated: "Platform for designers to showcase creative work..."
tabby-test: Creating AI Language Model session
tabby-test: AI tag suggestions: ["design", "creative", "portfolio", "ui", "web"]
tabby-test: AI-generated tags: ["design", "creative", "portfolio", "ui", "web"]
tabby-test: Added AI-generated tags: ["design", "creative", "portfolio", "ui", "web"]
tabby-test: Using AI-generated tags: ["design", "creative", "portfolio", "ui", "web"]
tabby-test: Generated 15 tags (including AI tags)
```

### Product Extraction with AI
```
tabby-test: Starting AI product data extraction
tabby-test: Summarizing page content
tabby-test: Page summary generated: "Wireless headphones with noise cancellation"
tabby-test: Sending prompt to AI Language Model
tabby-test: AI raw response: {"title":"Apple AirPods Max",...}
tabby-test: Successfully parsed AI response
tabby-test: Product saved with AI-extracted category: ["Electronics","Audio","Headphones"]
```

---

## Chrome Flags Required

Enable in `chrome://flags`:

### For Language Model (Prompt API)
```
chrome://flags/#prompt-api-for-gemini-nano
→ Set to "Enabled"
```

### For Optimization Guide (Summarizer)
```
chrome://flags/#optimization-guide-on-device-model  
→ Set to "Enabled BypassPerfRequirement"
```

### For Summarization API
```
chrome://flags/#summarization-api-for-gemini-nano
→ Set to "Enabled"
```

---

## Testing AI Features

### Test Summarizer
```javascript
// In DevTools console (any page)
const summarizer = await ai.summarizer.create();
const summary = await summarizer.summarize(document.body.innerText.slice(0, 2000));
console.log('Summary:', summary);
```

### Test Language Model
```javascript
const session = await ai.languageModel.create();
const result = await session.prompt('Extract 5 tags from this: ' + document.title);
console.log('Tags:', result);
```

### Test in Extension
Visit Dribbble.com and check console:
```
tabby-test: AI-generated tags: ["design", "creative", "portfolio"]
```

---

## AI Usage Statistics

Check which AI features are being used:

```javascript
const analytics = await db.getWeeklyAnalytics();

// Tags starting with "ai-" are AI-generated
const aiTags = analytics.topTags.filter(t => t.tag.startsWith('ai-'));
console.log('AI-detected themes:', aiTags);

// Example output:
// ai-design: 45 visits
// ai-creative: 38 visits  
// ai-tech: 22 visits
```

---

## Future AI Features (Coming Soon)

- **Translation API** - Auto-translate foreign product pages
- **Language Detector** - Detect page language
- **Writer API** - Generate product descriptions
- **Rewriter API** - Improve product titles

---

## Comparison: With vs Without AI

### Without AI (Meta tags only):
```javascript
tags: ['dribbble.com', 'day-tue', 'time-afternoon']
// ❌ No understanding of page content
```

### With AI (Summarizer + Language Model):
```javascript
tags: [
  'dribbble.com',
  'ai-design',      // ← Intelligent!
  'ai-creative',    // ← Intelligent!
  'ai-portfolio',   // ← Intelligent!
  'design',
  'nav-shots',
  'day-tue',
  'time-afternoon'
]
// ✅ Truly understands what you're browsing!
```

---

**The Result:** Your Tabby extension now has superhuman intelligence to categorize, tag, and understand every page you visit - all running locally on your device! 🚀
