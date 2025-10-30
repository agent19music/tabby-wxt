import React, { useState } from "react";
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

interface Product {
  id: string;
  name: string;
  image: string;
  url: string;
  price: string;
  visitedAt: string;
  rating: number;
  description?: string;

  category: string;
  subcategory?: string;
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
                {category.subcategories?.map((subcategory, index) => (
                  <motion.div
                    key={subcategory.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <SubcategoryItem subcategory={subcategory} />
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
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
      className="ml-12 p-4 bg-gradient-to-r from-card/40 to-card/20 border border-foreground/5 hover:border-primary/10 hover:shadow-md rounded-xl backdrop-blur-sm transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.1 }} className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-12 h-12 rounded-xl object-cover border border-foreground/10 group-hover:border-primary/20 transition-colors"
          />
          <motion.div
            initial={{ scale: 0 }}
            whileHover={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center"
          >
            <StarIcon className="w-2.5 h-2.5 fill-white text-background" />
          </motion.div>
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h5 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                {product.name}
              </h5>

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <CalendarDotIcon className="w-3 h-3 text-foreground/50" />

                  <span className="text-xs text-foreground/60">
                    {new Date(product.visitedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-bold text-foreground/50 group-hover:text-foreground/90 transition-colors">
                  {product.price}
                </span>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group-hover:bg-primary/20"
                  onClick={() => window.open(product.url, "_blank")}
                >
                  {/* <ExternalLinkIcon className="w-3 h-3 text-primary" /> */}
                  <ArrowUpRightIcon className="text-primary h-3 w-3" />
                </motion.button>
              </div>

              {product.description && (
                <div className="mt-2">
                  <Collapsible open={isDescOpen} onOpenChange={setIsDescOpen}>
                    <CollapsibleTrigger asChild>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="flex items-center justify-between p-2 rounded-lg bg-card/30 border border-foreground/5 hover:border-primary/10 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground/90">
                          Description
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
                            <p className="text-xs leading-relaxed text-foreground/70">
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

  // Mock data - replace with actual data from your state management
  const categories: Category[] = [
    {
      name: "Audio & Headphones",
      count: 12,
      subcategories: [
        {
          name: "Wireless Headphones",
          count: 8,
          products: [
            {
              id: "1",
              name: "Sony WH-1000XM5",
              image: soundcore,
              url: "https://www.sony.com/headphones/wh-1000xm5",
              price: "$399.99",
              visitedAt: "2024-01-15",
              rating: 4.8,
              description:
                "Premium over-ear headphones with industry-leading noise cancellation, crystal-clear calls, and all-day comfort.",
              category: "Audio & Headphones",
              subcategory: "Wireless Headphones",
            },
            {
              id: "2",
              name: "Bose QuietComfort 45",
              image: soundcore,
              url: "https://www.bose.com/quietcomfort-45",
              price: "$329.00",
              visitedAt: "2024-01-10",
              rating: 4.6,
              description:
                "Balanced sound with excellent comfort and reliable ANC for commuting, work, and travel.",
              category: "Audio & Headphones",
              subcategory: "Wireless Headphones",
            },
            {
              id: "3",
              name: "Apple AirPods Pro 2",
              image: soundcore,
              url: "https://www.apple.com/airpods-pro",
              price: "$249.00",
              visitedAt: "2024-01-05",
              rating: 4.5,
              description:
                "Adaptive Transparency and improved ANC in a compact, seamless experience across Apple devices.",
              category: "Audio & Headphones",
              subcategory: "Wireless Headphones",
            },
          ],
        },
        {
          name: "Wired Headphones",
          count: 4,
          products: [
            {
              id: "4",
              name: "Sennheiser HD 660S",
              image: soundcore,
              url: "https://www.sennheiser.com/hd-660-s",
              price: "$499.95",
              visitedAt: "2024-01-08",
              rating: 4.7,
              description:
                "Reference-grade open-back headphones delivering natural, detailed sound with wide soundstage.",
              category: "Audio & Headphones",
              subcategory: "Wired Headphones",
            },
          ],
        },
      ],
      products: [],
    },
    {
      name: "Electronics",
      count: 8,
      subcategories: [
        {
          name: "Smartphones",
          count: 3,
          products: [
            {
              id: "5",
              name: "iPhone 15 Pro",
              image: soundcore,
              url: "https://www.apple.com/iphone-15-pro",
              price: "$999.00",
              visitedAt: "2024-01-12",
              rating: 4.9,
              description:
                "A17 Pro chip, titanium design, and advanced cameras for powerful performance and creativity.",
              category: "Electronics",
              subcategory: "Smartphones",
            },
          ],
        },
        {
          name: "Laptops",
          count: 5,
          products: [
            {
              id: "6",
              name: "MacBook Pro M3",
              image: soundcore,
              url: "https://www.apple.com/macbook-pro",
              price: "$1999.00",
              visitedAt: "2024-01-20",
              rating: 4.8,
              description:
                "Blazing-fast M3 performance with stunning Liquid Retina display and exceptional battery life.",
              category: "Electronics",
              subcategory: "Laptops",
            },
          ],
        },
      ],
      products: [],
    },
    {
      name: "Home & Kitchen",
      count: 6,
      subcategories: [
        {
          name: "Kitchen Appliances",
          count: 4,
          products: [
            {
              id: "7",
              name: "Instant Pot Duo",
              image: soundcore,
              url: "https://www.instantpot.com/duo",
              price: "$99.95",
              visitedAt: "2024-01-18",
              rating: 4.6,
              description:
                "7-in-1 multi-cooker for fast and easy pressure cooking, slow cooking, and more.",
              category: "Home & Kitchen",
              subcategory: "Kitchen Appliances",
            },
          ],
        },
        {
          name: "Home Decor",
          count: 2,
          products: [
            {
              id: "8",
              name: "Smart Light Bulbs",
              image: soundcore,
              url: "https://www.philips.com/smart-lights",
              price: "$49.99",
              visitedAt: "2024-01-25",
              rating: 4.4,
              description:
                "Color-changing, app-controlled bulbs with schedules and voice assistant compatibility.",
              category: "Home & Kitchen",
              subcategory: "Home Decor",
            },
          ],
        },
      ],
      products: [],
    },
  ];

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
        (category.subcategories?.length ?? 0) > 0 ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalProducts = filteredCategories.reduce(
    (total, cat) =>
      total +
      (cat.subcategories?.reduce(
        (subTotal, sub) => subTotal + sub.products.length,
        0
      ) || 0),
    0
  );

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
