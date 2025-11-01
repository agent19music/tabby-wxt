import React, { useState } from "react";
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  StarIcon,
  CalendarIcon,
  LightbulbIcon,
  HistoryIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowUpRightIcon,
  CloudSlashIcon,
  RobotIcon,
} from "@phosphor-icons/react";

interface AIInsight {
  id: string;
  type: "recommendation" | "tip" | "comparison";
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
}

interface SearchHistoryProduct {
  id: string;
  name: string;
  image: string;
  url: string;
  price?: string;
  visitedAt: string;
  category: string;
  aiInsights?: {
    pros: string[];
    cons: string[];
    bestFor: string;
    comparison: string;
  };
  features?: string[];
  rating?: number;
}

interface ProductInsightsTabsProps {
  insights: AIInsight[];
  searchHistory: SearchHistoryProduct[];
  currentProduct: {
    name: string;
    url: string;
    category: string;
  };
  relatedProductIds?: string[]; // IDs of AI-recommended related products
  allProducts?: Array<{
    id: string;
    title: string;
    image?: string;
    url: string;
    price?: string;
    category: string;
  }>;
  isLoadingRecommendations?: boolean; // Loading state for related products
}

export const ProductInsightsTabs: React.FC<ProductInsightsTabsProps> = ({
  insights,
  searchHistory,
  currentProduct,
  relatedProductIds = [],
  allProducts = [],
  isLoadingRecommendations = false,
}) => {
  const [dateRange, setDateRange] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpansion = (productId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const filterProductsByDateRange = (
    products: SearchHistoryProduct[],
    range: string
  ) => {
    const now = new Date();
    const filterDate = new Date();

    switch (range) {
      case "day":
        filterDate.setDate(now.getDate() - 1);
        break;
      case "week":
        filterDate.setDate(now.getDate() - 7);
        break;
      case "month":
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case "all":
        return products;
      default:
        filterDate.setDate(now.getDate() - 7);
    }

    return products.filter(
      (product) => new Date(product.visitedAt) >= filterDate
    );
  };

  // Get related products from AI recommendations or fallback to search history
  const getRelatedProducts = (): SearchHistoryProduct[] => {
    // If we have AI recommendations, use those
    if (relatedProductIds.length > 0 && allProducts.length > 0) {
      const aiRecommended: SearchHistoryProduct[] = [];
      
      for (const id of relatedProductIds) {
        const product = allProducts.find(p => p.id === id);
        if (product) {
          // Convert to SearchHistoryProduct format
          aiRecommended.push({
            id: product.id,
            name: product.title,
            image: product.image || '',
            url: product.url,
            price: product.price,
            visitedAt: new Date().toISOString(), // Use current date since we don't have visit date
            category: product.category,
            // AI insights not available for recommended products
          });
        }
      }
      
      return aiRecommended;
    }
    
    // Fallback to search history filtering
    return filterProductsByDateRange(
      searchHistory.filter(
        (product) =>
          product.category === currentProduct.category &&
          product.name !== currentProduct.name
      ),
      dateRange
    ).slice(0, 8);
  };

  const relatedProducts = getRelatedProducts();
  const tabs = [
    {
      label: "AI Insights",
      icon: <RobotIcon size={32} className="w-3 h-3 mr-1" />,
      value: "insights",
    },
    {
      label: "Previous Products",
      icon: <CloudSlashIcon size={32} className="w-3 h-3 mr-1" />,
      value: "previous",
    },
  ];

  return (
    <Tabs defaultValue="insights" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card border border-border/50 p-1 h-[50px] rounded-full shadow-sm">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs data-[state=active]:bg-foreground/8 rounded-full transition-all duration-200"
          >
            {tab.icon} {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* AI Insights Tab */}
      <TabsContent value="insights" className="mt-3">
        {insights.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {insights.map((insight) => (
              <AccordionItem
                key={insight.id}
                value={insight.id}
                className="border-none"
              >
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2 text-left">
                    <div className={`w-2 h-2 rounded-full ${
                      insight.title === "Pros" 
                        ? "bg-green-500" 
                        : insight.title === "Cons" 
                        ? "bg-red-500" 
                        : "bg-foreground/50"
                    }`}></div>
                    <span className="font-semibold text-sm">{insight.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="bg-card/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm text-foreground/80">
                      {insight.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-foreground/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">1</span>
                        </div>
                        <a
                          href={insight.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                        >
                          {insight.source}
                          <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/50">
                      AI may make mistakes. Learn more
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No AI insights available for this product</p>
          </div>
        )}
      </TabsContent>

      {/* Previous Products Tab */}
      <TabsContent value="previous" className="mt-3">
        {isLoadingRecommendations ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Spinner className="w-6 h-6" />
              <p className="text-sm text-muted-foreground">Finding related products...</p>
            </div>
          </div>
        ) : relatedProducts.length > 0 ? (
          <div className="space-y-3">
            {/* Previous Products */}
            <div className="space-y-3">
              {relatedProducts.map((product) => {
                const isExpanded = expandedCards.has(product.id);
                return (
                  <div
                    key={product.id}
                    className="bg-card/50 rounded-lg border border-foreground/5 hover:bg-card/70 transition-colors"
                  >
                    {/* Collapsible Header */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleCardExpansion(product.id)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm text-wrap">
                                {product.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                {product.price && (
                                  <p className="text-sm font-medium text-muted-foreground">
                                    {product.price}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="  hover:bg-foreground/5 transition-colors h-8 w-8 rounded-full"
                              >
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-3 h-3" />
                                ) : (
                                  <ChevronDownIcon className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        {/* Quick Action */}
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs rounded-[10px] hover:bg-foreground/5 transition-colors"
                            onClick={() => window.open(product.url, "_blank")}
                          >
                            <ArrowUpRightIcon className="w-3 h-3 mr-1" />
                          </Button>
                        </div>

                        {/* AI Insights */}
                        {product.aiInsights && (
                          <div className="space-y-3 pt-2 border-t border-foreground/5">
                            {/* AI Summary */}
                            <div className="space-y-2">
                              <p className="text-xs text-foreground/70 leading-relaxed">
                                <span className="font-medium text-foreground/80">
                                  Best for:
                                </span>{" "}
                                {product.aiInsights.bestFor}
                              </p>
                              <p className="text-xs text-foreground/70 leading-relaxed">
                                <span className="font-medium text-foreground/80">
                                  vs Current:
                                </span>{" "}
                                {product.aiInsights.comparison}
                              </p>
                            </div>

                            {/* Quick Pros/Cons */}
                            <div className="space-y-1">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-green-600 min-w-0">
                                  ✓
                                </span>
                                <div className="text-xs text-foreground/70 leading-relaxed">
                                  {product.aiInsights.pros
                                    .slice(0, 2)
                                    .join(", ")}
                                </div>
                              </div>
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-medium text-red-500 min-w-0">
                                  ✗
                                </span>
                                <div className="text-xs text-foreground/70 leading-relaxed">
                                  {product.aiInsights.cons
                                    .slice(0, 2)
                                    .join(", ")}
                                </div>
                              </div>
                            </div>

                            {/* Features */}
                            {product.features &&
                              product.features.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-xs text-foreground/50">
                                    Features:
                                  </span>
                                  {product.features
                                    .slice(0, 4)
                                    .map((feature, index) => (
                                      <span
                                        key={index}
                                        className="text-xs bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded-md"
                                      >
                                        {feature}
                                      </span>
                                    ))}
                                  {product.features.length > 4 && (
                                    <span className="text-xs text-foreground/50">
                                      +{product.features.length - 4}
                                    </span>
                                  )}
                                </div>
                              )}

                            {/* AI Expand Button */}
                            <div className="flex justify-center pt-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-foreground/60 hover:text-foreground/80"
                                onClick={() => {
                                  console.log(
                                    `Expand AI insights for ${product.name}`
                                  );
                                }}
                              >
                                <ChevronDownIcon className="w-3 h-3 mr-1" />
                                Get more AI insights
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <HistoryIcon className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-foreground/60">
              No previous products found for this category
            </p>
            <p className="text-xs text-foreground/40 mt-1">
              Try browsing more products to see comparisons
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
