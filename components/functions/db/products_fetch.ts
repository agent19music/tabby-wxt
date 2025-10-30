// Utility functions to fetch and organize products for the UI
import type { Product, ProductHistory } from "../../types/db";
import { getAllProducts as getAllProductsFromStorage, getProductHistory } from "./products_site_storage";

// Re-export for easier imports
export { getAllProductsFromStorage as getAllProducts };

export interface UIProduct {
  id: string;
  name: string;
  image?: string;
  url: string;
  price: string;
  visitedAt: string;
  rating?: number;
  description?: string;
  category: string;
  subcategory?: string;
  discount?: string;
  visitCount: number;
  lowestPrice?: string;
}

export interface UICategory {
  name: string;
  count: number;
  subcategories?: UISubcategory[];
  products: UIProduct[];
}

export interface UISubcategory {
  name: string;
  count: number;
  products: UIProduct[];
}

/**
 * Convert storage Product to UI Product format
 */
function convertToUIProduct(product: Product): UIProduct {
  return {
    id: product.id,
    name: product.title,
    image: product.image,
    url: product.url,
    price: product.price || "N/A",
    visitedAt: new Date(product.last_seen).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    description: product.summary,
    category: product.category || "Other",
    discount: product.discount,
    visitCount: product.visit_count,
    lowestPrice: product.lowest_price,
  };
}

/**
 * Organize products by category
 */
function organizeByCategory(products: UIProduct[]): UICategory[] {
  const categoryMap = new Map<string, UIProduct[]>();

  // Group products by category
  products.forEach((product) => {
    const category = product.category || "Other";
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(product);
  });

  // Convert to UI format
  const categories: UICategory[] = [];
  categoryMap.forEach((products, categoryName) => {
    categories.push({
      name: formatCategoryName(categoryName),
      count: products.length,
      products: products,
      subcategories: [], // Can be enhanced later with subcategories
    });
  });

  // Sort by count (most products first)
  categories.sort((a, b) => b.count - a.count);

  return categories;
}

/**
 * Format category name for display
 */
function formatCategoryName(category: string): string {
  // Convert snake_case to Title Case
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Fetch all products and organize by category
 */
export async function fetchProductsByCategory(): Promise<UICategory[]> {
  try {
    const products = await getAllProductsFromStorage();
    
    if (products.length === 0) {
      return [];
    }

    // Convert to UI format
    const uiProducts = products.map(convertToUIProduct);

    // Sort by last visited (most recent first)
    uiProducts.sort((a, b) => {
      const dateA = new Date(a.visitedAt).getTime();
      const dateB = new Date(b.visitedAt).getTime();
      return dateB - dateA;
    });

    // Organize by category
    return organizeByCategory(uiProducts);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

/**
 * Fetch products sorted by most recently visited
 */
export async function fetchRecentProducts(limit: number = 20): Promise<UIProduct[]> {
  try {
    const products = await getAllProductsFromStorage();
    const uiProducts = products.map(convertToUIProduct);

    // Sort by last visited
    uiProducts.sort((a, b) => {
      const dateA = new Date(a.visitedAt).getTime();
      const dateB = new Date(b.visitedAt).getTime();
      return dateB - dateA;
    });

    return uiProducts.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch recent products:", error);
    return [];
  }
}

/**
 * Fetch products sorted by visit count
 */
export async function fetchMostViewedProducts(limit: number = 10): Promise<UIProduct[]> {
  try {
    const products = await getAllProductsFromStorage();
    const uiProducts = products.map(convertToUIProduct);

    // Sort by visit count
    uiProducts.sort((a, b) => b.visitCount - a.visitCount);

    return uiProducts.slice(0, limit);
  } catch (error) {
    console.error("Failed to fetch most viewed products:", error);
    return [];
  }
}

/**
 * Search products by query
 */
export async function searchProducts(query: string): Promise<UIProduct[]> {
  try {
    const products = await getAllProductsFromStorage();
    const uiProducts = products.map(convertToUIProduct);

    if (!query.trim()) {
      return uiProducts;
    }

    const lowerQuery = query.toLowerCase();

    // Filter products
    return uiProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerQuery) ||
        product.description?.toLowerCase().includes(lowerQuery) ||
        product.category.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error("Failed to search products:", error);
    return [];
  }
}

/**
 * Get product by URL
 */
export async function getProductByUrl(url: string): Promise<UIProduct | null> {
  try {
    const products = await getAllProductsFromStorage();
    const product = products.find(p => p.url === url);
    
    if (!product) {
      return null;
    }

    return convertToUIProduct(product);
  } catch (error) {
    console.error("Failed to get product by URL:", error);
    return null;
  }
}

/**
 * Get product statistics
 */
export async function getProductStats(): Promise<{
  totalProducts: number;
  totalVisits: number;
  categoriesCount: number;
  mostViewedCategory: string;
}> {
  try {
    const products = await getAllProductsFromStorage();

    const totalVisits = products.reduce((sum, p) => sum + p.visit_count, 0);

    const categoryCount = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || "Other";
      categoryCount.set(cat, (categoryCount.get(cat) || 0) + 1);
    });

    let mostViewedCategory = "N/A";
    let maxCount = 0;
    categoryCount.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count;
        mostViewedCategory = formatCategoryName(category);
      }
    });

    return {
      totalProducts: products.length,
      totalVisits,
      categoriesCount: categoryCount.size,
      mostViewedCategory,
    };
  } catch (error) {
    console.error("Failed to get product stats:", error);
    return {
      totalProducts: 0,
      totalVisits: 0,
      categoriesCount: 0,
      mostViewedCategory: "N/A",
    };
  }
}
