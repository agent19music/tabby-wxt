import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  FilterIcon,
  StarIcon,
  ExternalLinkIcon,
  ClockIcon,
  TagIcon,
  ArrowUpRight,
  ShoppingCartIcon,
  CheckIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import soundcore from "@/assets/soundcore.png";
import { ArrowUpRightIcon, CalendarDotIcon } from "@phosphor-icons/react";
import { fetchProductsByCategory, type UICategory } from "@/components/functions/db/products_fetch";
import { addToCart, isInCart } from "@/components/functions/cart_handling";

interface Product {
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
  visitCount?: number;
  lowestPrice?: string;
}

interface Category {
  name: string;
  count: number;
  subcategories?: {
    name: string;
    count: number;
    products: Product[];
  }[];
  products: Product[];
}

// Search and Filter Header Component
export const SearchFilterHeader: React.FC<{
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  totalProducts: number;
}> = ({ searchQuery, setSearchQuery, totalProducts }) => {
  return (
    <div className="space-y-3 w-full">
      <div className="relative w-full">
        <input
          placeholder="Search past products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-card border-border/50 border h-12 px-4 w-full rounded-2xl backdrop-blur-sm focus:border-border transition-all duration-200 outline-none shadow-sm"
        />
      </div>
    </div>
  );
};

// Category Item Component
export const CategoryItem: React.FC<{
  category: Category;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ category, isExpanded, onToggle }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-3"
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.998 }}
            className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border/50 hover:border-border backdrop-blur-sm transition-all duration-200 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3">
              <ChevronRightIcon
                className={`w-4 h-4 text-foreground/70 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
              <div>
                <h3 className="font-semibold text-base text-foreground">
                  {category.name}
                </h3>
                <p className="text-xs text-foreground/60 mt-0.5">
                  {category.count} products
                </p>
              </div>
            </div>
          </motion.div>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CollapsibleContent className="mt-3 space-y-2">
                {/* Show subcategories if they exist */}
                {category.subcategories && category.subcategories.length > 0 ? (
                  category.subcategories.map((subcategory, index) => (
                    <motion.div
                      key={subcategory.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <SubcategoryItem subcategory={subcategory} />
                    </motion.div>
                  ))
                ) : (
                  /* Show products directly if no subcategories */
                  category.products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="ml-6"
                    >
                      <ProductItem product={product} />
                    </motion.div>
                  ))
                )}
              </CollapsibleContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible>
    </motion.div>
  );
};

// Subcategory Item Component
export const SubcategoryItem: React.FC<{
  subcategory: {
    name: string;
    count: number;
    products: Product[];
  };
}> = ({ subcategory }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="ml-6">
      <Collapsible
        open={isExpanded}
        onOpenChange={() => setIsExpanded(!isExpanded)}
      >
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.998 }}
            className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/50 hover:border-border backdrop-blur-sm transition-all duration-200 cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-2">
              <ChevronRightIcon
                className={`w-3 h-3 text-foreground/70 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
              <div>
                <h4 className="font-medium text-sm text-foreground">
                  {subcategory.name}
                </h4>
                <p className="text-xs text-foreground/50 mt-0.5">
                  {subcategory.count} products
                </p>
              </div>
            </div>
          </motion.div>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <CollapsibleContent className="mt-2 space-y-2">
                {subcategory.products.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <ProductItem product={product} />
                  </motion.div>
                ))}
              </CollapsibleContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Collapsible>
    </div>
  );
};

// Product Item Component
export const ProductItem: React.FC<{ product: Product }> = ({ product }) => {
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [inCart, setInCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check if product is in cart on mount
  useEffect(() => {
    checkCartStatus();
  }, [product.id]);

  const checkCartStatus = async () => {
    const status = await isInCart(product.id);
    setInCart(status);
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);
    const success = await addToCart({
      id: product.id,
      name: product.name,
      image: product.image,
      url: product.url,
      price: product.price,
      discount: product.discount,
      description: product.description,
      visitedAt: product.visitedAt,
      visitCount: product.visitCount,
    });
    
    if (success) {
      setInCart(true);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    setAddingToCart(false);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      className="ml-12 p-4 bg-card rounded-2xl border border-border/50 hover:border-border backdrop-blur-sm transition-all duration-200 shadow-sm"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="relative shrink-0">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-foreground/5 flex items-center justify-center border border-border/30">
              <TagIcon className="w-6 h-6 text-foreground/30" />
            </div>
          )}
          {product.visitCount && product.visitCount > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
              <span className="text-[9px] font-semibold text-background">{product.visitCount}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Title and Actions */}
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-sm text-foreground line-clamp-2">
                {product.name}
              </h5>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-foreground">
                  {product.price}
                </span>
                {product.lowestPrice && product.lowestPrice !== product.price && (
                  <span className="text-xs text-foreground/50 line-through">
                    {product.lowestPrice}
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={
                  addingToCart 
                    ? { scale: [1, 0.9, 1] } 
                    : showSuccess 
                    ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }
                    : {}
                }
                transition={{ duration: 0.4 }}
                className={`p-2 rounded-full transition-all relative ${
                  inCart
                    ? "bg-foreground/15"
                    : "bg-foreground/5 hover:bg-foreground/10"
                }`}
                onClick={handleAddToCart}
                disabled={addingToCart || inCart}
                title={inCart ? "In Cart" : addingToCart ? "Adding..." : "Add to Cart"}
              >
                <AnimatePresence mode="wait">
                  {showSuccess ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckIcon className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cart"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <ShoppingCartIcon className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <button
                className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-colors"
                onClick={() => window.open(product.url, "_blank")}
                title="Open product page"
              >
                <ArrowUpRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-foreground/60">
              {new Date(product.visitedAt).toLocaleDateString()}
            </span>
            {product.discount && (
              <span className="text-xs text-foreground/70">
                {product.discount}
              </span>
            )}
          </div>

          {/* Description Collapsible */}
          {product.description && (
            <Collapsible open={isDescOpen} onOpenChange={setIsDescOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors">
                  <span className="text-xs font-medium text-foreground/70">
                    {isDescOpen ? "Hide" : "Show"} Description
                  </span>
                  <ChevronDownIcon
                    className={`w-3 h-3 text-foreground/70 transition-transform ${
                      isDescOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <AnimatePresence>
                {isDescOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CollapsibleContent className="pt-2">
                      <p className="text-xs leading-relaxed text-foreground/70">
                        {product.description}
                      </p>
                    </CollapsibleContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Empty State Component
export const EmptyState: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="text-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
      >
        <SearchIcon className="w-8 h-8 text-primary/60" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        No products found
      </motion.h3>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-foreground/60"
      >
        Try adjusting your search terms or browse different categories
      </motion.p>
    </motion.div>
  );
};

// Main Past Products Component
export const PastProductsMain: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [categories, setCategories] = useState<UICategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const fetchedCategories = await fetchProductsByCategory();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      products: category.products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
      subcategories: category.subcategories
        ?.map((subcategory) => ({
          ...subcategory,
          products: subcategory.products.filter(
            (product) =>
              product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.category
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              product.subcategory
                ?.toLowerCase()
                .includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((subcategory) => subcategory.products.length > 0),
    }))
    .filter(
      (category) =>
        category.products.length > 0 ||
        (category.subcategories?.length ?? 0) > 0 ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalProducts = filteredCategories.reduce(
    (total, cat) =>
      total +
      cat.products.length +
      (cat.subcategories?.reduce(
        (subTotal, sub) => subTotal + sub.products.length,
        0
      ) || 0),
    0
  );

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-foreground/60">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-2 px-4 "
    >
      <SearchFilterHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        totalProducts={totalProducts}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <AnimatePresence mode="wait">
          {filteredCategories.length > 0 ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {filteredCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <CategoryItem
                    category={category}
                    isExpanded={expandedCategories.has(category.name)}
                    onToggle={() => toggleCategory(category.name)}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
