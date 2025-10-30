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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 w-full"
    >
      <div className="flex items-center gap-2 rounded-[100px] w-full">
        <div className="relative flex-1">
          <input
            placeholder="Search past products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className=" bg-card/50 border-foreground/5  border min-h-12 p-2 px-4  w-full rounded-[100px] backdrop-blur-sm focus:border-primary/50 transition-all duration-200"
          />
        </div>
      </div>
    </motion.div>
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between p-4 bg-gradient-to-r from-card/80 to-card/60 rounded-2xl border border-foreground/10 hover:border-primary/20 hover:shadow-lg backdrop-blur-sm transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4 text-primary" />
              </motion.div>
              <div>
                <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <TagIcon className="w-3 h-3 text-foreground/50" />
                  <p className="text-xs text-foreground/60">
                    {category.count} products
                  </p>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ scale: isExpanded ? 1.1 : 1 }}
              className="w-2 h-2 rounded-full bg-primary/30 group-hover:bg-primary/50"
            />
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
    <motion.div whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>
      <Collapsible
        open={isExpanded}
        onOpenChange={() => setIsExpanded(!isExpanded)}
      >
        <CollapsibleTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="ml-6 flex items-center justify-between p-3 bg-gradient-to-r from-card/60 to-card/40 rounded-xl border border-foreground/5 hover:border-primary/10 hover:shadow-md backdrop-blur-sm transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
                className="p-1.5 rounded-full bg-primary/5 group-hover:bg-primary/15 transition-colors"
              >
                <ChevronRightIcon className="w-3 h-3 text-primary/70" />
              </motion.div>
              <div>
                <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {subcategory.name}
                </h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <TagIcon className="w-2.5 h-2.5 text-foreground/40" />
                  <p className="text-xs text-foreground/50">
                    {subcategory.count} products
                  </p>
                </div>
              </div>
            </div>
            <motion.div
              animate={{ scale: isExpanded ? 1.2 : 1 }}
              className="w-1.5 h-1.5 rounded-full bg-primary/20 group-hover:bg-primary/40"
            />
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
    </motion.div>
  );
};

// Product Item Component
export const ProductItem: React.FC<{ product: Product }> = ({ product }) => {
  const [isDescOpen, setIsDescOpen] = useState(false);
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="ml-12 p-4 bg-gradient-to-r from-card/40 to-card/20 border border-foreground/5 hover:border-primary/10 hover:shadow-md rounded-xl backdrop-blur-sm transition-all duration-200 group"
    >
      <div className="flex items-start gap-4 w-full">
        <motion.div whileHover={{ scale: 1.1 }} className="relative flex-shrink-0">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover border border-foreground/10 group-hover:border-primary/20 transition-colors"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-foreground/5 border border-foreground/10 group-hover:border-primary/20 transition-colors flex items-center justify-center">
              <TagIcon className="w-8 h-8 text-foreground/30" />
            </div>
          )}
          {product.visitCount && product.visitCount > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
            >
              <span className="text-[10px] font-bold text-white">{product.visitCount}</span>
            </motion.div>
          )}
        </motion.div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Title and Link */}
          <div className="flex items-start justify-between gap-2 w-full">
            <h5 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1 min-w-0">
              {product.name}
            </h5>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex-shrink-0"
              onClick={() => window.open(product.url, "_blank")}
            >
              <ArrowUpRightIcon className="text-primary h-3.5 w-3.5" />
            </motion.button>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <CalendarDotIcon className="w-3 h-3 text-foreground/50" />
              <span className="text-xs text-foreground/60">
                {new Date(product.visitedAt).toLocaleDateString()}
              </span>
            </div>
            {product.discount && (
              <div className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  {product.discount}
                </span>
              </div>
            )}
          </div>

          {/* Price Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-foreground/80 group-hover:text-foreground transition-colors">
                {product.price}
              </span>
              {product.lowestPrice && product.lowestPrice !== product.price && (
                <span className="text-xs text-foreground/50 line-through">
                  {product.lowestPrice}
                </span>
              )}
            </div>
          </div>

          {/* Description Collapsible */}
          {product.description && (
            <div className="mt-1">
              <Collapsible open={isDescOpen} onOpenChange={setIsDescOpen}>
                <CollapsibleTrigger asChild>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="flex items-center justify-between p-2 rounded-lg bg-card/30 border border-foreground/5 hover:border-primary/10 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground/90">
                      {isDescOpen ? "Hide" : "Show"} Description
                    </span>
                    <motion.span
                      animate={{ rotate: isDescOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-1 rounded-full bg-primary/5"
                    >
                      <ChevronDownIcon className="w-3 h-3 text-primary/70" />
                    </motion.span>
                  </motion.div>
                </CollapsibleTrigger>

                <AnimatePresence>
                  {isDescOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <CollapsibleContent className="pt-2">
                        <p className="text-xs leading-relaxed text-foreground/70 break-words">
                          {product.description}
                        </p>
                      </CollapsibleContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Collapsible>
            </div>
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
