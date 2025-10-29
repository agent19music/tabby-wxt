// Debug utilities for inspecting Tabby database
// Open DevTools Console and import this module to use these functions

import { db } from './db';

export const dbDebug = {
  // Get all data from all stores
  async dumpAll() {
    console.log('tabby-test: 🔍 Dumping entire database...');
    
    const products = await db.getAllProducts();
    const siteProducts = await db.getSiteProductsByProductId(0); // Get all by passing 0
    const weeklyAnalytics = await db.getWeeklyAnalytics();
    
    console.log('📦 PRODUCTS (Canonical):', products);
    console.log('🏪 SITE PRODUCTS:', siteProducts);
    console.log('📊 WEEKLY ANALYTICS:', weeklyAnalytics);
    
    return {
      products,
      siteProducts,
      analytics: weeklyAnalytics
    };
  },

  // Get product with all its site data
  async inspectProduct(productId: number) {
    console.log(`tabby-test: 🔍 Inspecting product ${productId}...`);
    
    const product = await db.getProductById(productId);
    const siteProducts = await db.getSiteProductsByProductId(productId);
    const visits = await db.getProductVisits(productId);
    
    console.log('📦 Product:', product);
    console.log('🏪 Site Products:', siteProducts);
    console.log('👁️ Visits:', visits);
    
    return { product, siteProducts, visits };
  },

  // Get recent site visits
  async getRecentVisits(limit = 20) {
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const visits = await db.getSiteVisits(weekAgo);
    
    const sorted = visits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
    
    console.log(`tabby-test: 📍 Last ${limit} visits:`, sorted);
    return sorted;
  },

  // Get products by category
  async getCategory(category: string) {
    const products = await db.getProductsByCategory(category);
    console.log(`tabby-test: 🏷️ Products in "${category}":`, products);
    return products;
  },

  // Get analytics report
  async getAnalytics() {
    const analytics = await db.getWeeklyAnalytics();
    
    console.log('📊 WEEKLY ANALYTICS REPORT');
    console.log('═'.repeat(50));
    console.log(`Total Visits: ${analytics.totalVisits}`);
    console.log(`Product Pages: ${analytics.productPageVisits}`);
    console.log(`Unique Sites: ${analytics.uniqueSites}`);
    console.log(`Products Tracked: ${analytics.totalProductsTracked}`);
    console.log('\n🏆 Top Sites:');
    analytics.topSites.forEach((s: any, i: number) => 
      console.log(`  ${i + 1}. ${s.site}: ${s.visits} visits`)
    );
    console.log('\n📅 Activity by Day:');
    analytics.dayOfWeekPattern.forEach((d: any) => 
      console.log(`  ${d.day}: ${d.visits} visits`)
    );
    console.log('\n🏷️ Top Categories:');
    analytics.topCategories.forEach((c: any, i: number) => 
      console.log(`  ${i + 1}. ${c.category}: ${c.products} products`)
    );
    
    return analytics;
  },

  // Clear all data (use with caution!)
  async clearAll() {
    const confirm = window.confirm('⚠️ This will delete ALL data. Are you sure?');
    if (!confirm) {
      console.log('tabby-test: Cancelled');
      return;
    }
    
    console.log('tabby-test: 🗑️ Clearing database...');
    // This will require reopening the database
    indexedDB.deleteDatabase('tabby_shopping');
    console.log('tabby-test: ✅ Database cleared. Reload the extension.');
  }
};

// Make it globally available in console
if (typeof window !== 'undefined') {
  (window as any).tabbyDebug = dbDebug;
  console.log('tabby-test: 🛠️ Debug tools loaded! Use window.tabbyDebug');
}

export default dbDebug;
