# 🔍 How to Inspect Tabby Database

## Method 1: Chrome DevTools (Built-in) ⭐ Recommended

### Step 1: Open Chrome DevTools
1. Click on the Tabby extension icon
2. Right-click → **Inspect** (or press F12)
3. Go to the **Application** tab

### Step 2: Navigate to IndexedDB
1. In the left sidebar, expand **Storage** → **IndexedDB**
2. Expand **tabby_shopping**
3. You'll see all your stores:
   - `products` - Canonical products (deduplicated)
   - `site_products` - Per-site product data
   - `site_visits` - All page visits with tags
   - `product_visits` - Legacy visit tracking

### Step 3: Inspect Data
- Click on any store to view all records
- Click on a record to see detailed values
- You can see indexes on the right
- Double-click values to edit (be careful!)

---

## Method 2: Browser Console Commands

### Open Background Service Worker Console
1. Go to `chrome://extensions`
2. Find **Tabby** extension
3. Click **service worker** link (under "Inspect views")
4. This opens the background script console

### Quick Commands

#### Get All Products
```javascript
// In background console
const products = await db.getAllProducts();
console.table(products);
```

#### Get Weekly Analytics
```javascript
const analytics = await db.getWeeklyAnalytics();
console.log(analytics);
```

#### Get Recent Visits
```javascript
const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
const visits = await db.getSiteVisits(weekAgo);
console.table(visits);
```

#### Inspect Specific Product
```javascript
const productId = 1;
const product = await db.getProductById(productId);
const siteProducts = await db.getSiteProductsByProductId(productId);
console.log('Product:', product);
console.log('On Sites:', siteProducts);
```

#### Get Products by Category
```javascript
const electronics = await db.getProductsByCategory('Electronics');
console.table(electronics);
```

---

## Method 3: Use Debug Utilities (Advanced)

The extension includes `lib/db-debug.ts` with helper functions.

### In Content Script Console

```javascript
// Get comprehensive dump
const data = await tabbyDebug.dumpAll();

// Inspect specific product
await tabbyDebug.inspectProduct(1);

// Get recent visits
await tabbyDebug.getRecentVisits(50);

// Get products by category
await tabbyDebug.getCategory('Electronics');

// Get formatted analytics report
await tabbyDebug.getAnalytics();
```

---

## Method 4: Database Viewer UI

I've created a `DatabaseViewer` component you can add to your popup or sidepanel.

### Add to Popup
```tsx
// In entrypoints/popup/App.tsx
import { DatabaseViewer } from '@/components/ui/database-viewer';

function App() {
  return (
    <div>
      <h1>Tabby Database</h1>
      <DatabaseViewer />
    </div>
  );
}
```

---

## Method 5: Export Data to JSON

### In Background Console
```javascript
// Export all data
const products = await db.getAllProducts();
const analytics = await db.getWeeklyAnalytics();

const exportData = {
  products,
  analytics,
  exportDate: new Date().toISOString()
};

// Copy to clipboard
copy(JSON.stringify(exportData, null, 2));

// Or download as file
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `tabby-export-${Date.now()}.json`;
a.click();
```

---

## Useful Console Snippets

### Count Products by Category
```javascript
const products = await db.getAllProducts();
const categoryCount = products.reduce((acc, p) => {
  const cat = p.category?.[0] || 'Uncategorized';
  acc[cat] = (acc[cat] || 0) + 1;
  return acc;
}, {});
console.table(categoryCount);
```

### Find Most Expensive Product
```javascript
const products = await db.getAllProducts();
const allSiteProducts = [];
for (const p of products) {
  const siteProds = await db.getSiteProductsByProductId(p.id);
  allSiteProducts.push(...siteProds);
}
const mostExpensive = allSiteProducts.sort((a, b) => b.price - a.price)[0];
console.log('Most expensive:', mostExpensive);
```

### Get Price Range for Product
```javascript
const productId = 1;
const siteProducts = await db.getSiteProductsByProductId(productId);
const prices = siteProducts.map(sp => ({ site: sp.site, price: sp.price }));
console.table(prices.sort((a, b) => a.price - b.price));
```

### Sites You Visit Most
```javascript
const analytics = await db.getWeeklyAnalytics();
console.table(analytics.topSites);
```

### Your Shopping Day Pattern
```javascript
const analytics = await db.getWeeklyAnalytics();
const pattern = analytics.dayOfWeekPattern;
const maxDay = pattern.reduce((max, d) => d.visits > max.visits ? d : max);
console.log(`You shop most on ${maxDay.day} with ${maxDay.visits} visits`);
```

---

## Clear Database (Reset)

### Option 1: Via Console
```javascript
indexedDB.deleteDatabase('tabby_shopping');
// Then reload extension
```

### Option 2: Via Chrome
1. DevTools → Application → IndexedDB
2. Right-click **tabby_shopping**
3. Click **Delete database**

---

## Database Schema Quick Reference

### Products Table
```typescript
{
  id: number
  title: string
  normalizedTitle: string
  category: string[]  // Max 3 levels
  brand: string
  viewCount: number
  siteCount: number
  firstSeen: number
  lastSeen: number
}
```

### Site Products Table
```typescript
{
  id: number
  productId: number
  site: string
  url: string
  title: string
  price: number
  currency: string
  imageUrl: string
  imageHash: string
  priceHistory: [{ price, timestamp }]
  firstSeen: number
  lastSeen: number
}
```

### Site Visits Table
```typescript
{
  id: number
  url: string
  site: string
  domain: string
  title: string
  tags: string[]
  isProductPage: boolean
  productId?: number
  timestamp: number
}
```

---

## Tips

1. **Use console.table()** for better formatting
2. **Service worker console** has access to `db` object
3. **Content script console** needs to message background
4. **IndexedDB in DevTools** is the easiest for browsing
5. **Export data** regularly for backup

---

## Common Queries

### "How many products have I tracked?"
```javascript
const products = await db.getAllProducts();
console.log(`Total: ${products.length}`);
```

### "What's my most viewed product?"
```javascript
const analytics = await db.getWeeklyAnalytics();
console.log(analytics.mostViewedProducts[0]);
```

### "Which site has the best prices?"
```javascript
const analytics = await db.getWeeklyAnalytics();
console.log('Your top sites:', analytics.topSites);
```

### "What tags describe my browsing?"
```javascript
const analytics = await db.getWeeklyAnalytics();
console.log(analytics.topTags);
```

---

**Pro Tip:** Bookmark the service worker console for quick access to database inspection! 🔖
