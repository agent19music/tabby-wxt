// Cart handling functions using Chrome Storage API

export interface CartProduct {
  id: string;
  name: string;
  image?: string;
  url: string;
  price: number; // Numeric for calculations
  originalPrice?: string; // Original string format like "$399.99"
  quantity: number;
  variant?: string;
  discount?: string;
  description?: string;
  visitedAt?: string;
  visitCount?: number;
  addedAt: number; // Timestamp
}

const CART_STORAGE_KEY = "shopping_cart";

/**
 * Get all items in the cart
 */
export async function getCartItems(): Promise<CartProduct[]> {
  try {
    const result = await chrome.storage.local.get(CART_STORAGE_KEY);
    return result[CART_STORAGE_KEY] || [];
  } catch (error) {
    console.error("Error fetching cart items:", error);
    return [];
  }
}

/**
 * Add a product to the cart
 */
export async function addToCart(product: {
  id: string;
  name: string;
  image?: string;
  url: string;
  price: string;
  variant?: string;
  discount?: string;
  description?: string;
  visitedAt?: string;
  visitCount?: number;
}): Promise<boolean> {
  try {
    const items = await getCartItems();
    
    // Parse price string to number (remove currency symbols and commas)
    const priceNum = parseFloat(product.price.replace(/[^0-9.]/g, ""));
    
    // Check if product already exists
    const existingIndex = items.findIndex((item) => item.id === product.id);
    
    if (existingIndex !== -1) {
      // Increase quantity
      items[existingIndex].quantity += 1;
    } else {
      // Add new item
      const newItem: CartProduct = {
        id: product.id,
        name: product.name,
        image: product.image,
        url: product.url,
        price: priceNum,
        originalPrice: product.price,
        quantity: 1,
        variant: product.variant,
        discount: product.discount,
        description: product.description,
        visitedAt: product.visitedAt,
        visitCount: product.visitCount,
        addedAt: Date.now(),
      };
      items.push(newItem);
    }
    
    await chrome.storage.local.set({ [CART_STORAGE_KEY]: items });
    console.log(`Added to cart: ${product.name}`);
    return true;
  } catch (error) {
    console.error("Error adding to cart:", error);
    return false;
  }
}

/**
 * Remove a product from the cart
 */
export async function removeFromCart(productId: string): Promise<boolean> {
  try {
    const items = await getCartItems();
    const filtered = items.filter((item) => item.id !== productId);
    await chrome.storage.local.set({ [CART_STORAGE_KEY]: filtered });
    console.log(`Removed from cart: ${productId}`);
    return true;
  } catch (error) {
    console.error("Error removing from cart:", error);
    return false;
  }
}

/**
 * Update quantity of a cart item
 */
export async function updateCartQuantity(
  productId: string,
  delta: number
): Promise<boolean> {
  try {
    const items = await getCartItems();
    const itemIndex = items.findIndex((item) => item.id === productId);
    
    if (itemIndex === -1) {
      return false;
    }
    
    const newQuantity = Math.max(1, items[itemIndex].quantity + delta);
    items[itemIndex].quantity = newQuantity;
    
    await chrome.storage.local.set({ [CART_STORAGE_KEY]: items });
    return true;
  } catch (error) {
    console.error("Error updating cart quantity:", error);
    return false;
  }
}

/**
 * Clear all items from the cart
 */
export async function clearCart(): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [CART_STORAGE_KEY]: [] });
    console.log("Cart cleared");
    return true;
  } catch (error) {
    console.error("Error clearing cart:", error);
    return false;
  }
}

/**
 * Get cart item count
 */
export async function getCartItemCount(): Promise<number> {
  try {
    const items = await getCartItems();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch (error) {
    console.error("Error getting cart count:", error);
    return 0;
  }
}

/**
 * Check if a product is in the cart
 */
export async function isInCart(productId: string): Promise<boolean> {
  try {
    const items = await getCartItems();
    return items.some((item) => item.id === productId);
  } catch (error) {
    console.error("Error checking cart:", error);
    return false;
  }
}
