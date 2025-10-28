import React, { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  StarIcon,
  CalendarIcon,
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

interface AIInsightsProps {
  insights: AIInsight[];
  searchHistory: SearchHistoryProduct[];
  currentProduct: {
    name: string;
    url: string;
    category: string;
  };
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  insights,
  searchHistory,
  currentProduct,
}) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>("all");

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
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

  const relatedProducts = filterProductsByDateRange(
    searchHistory.filter(
      (product) =>
        product.category === currentProduct.category &&
        product.name !== currentProduct.name
    ),
    dateRange
  ).slice(0, 8);

  return (
    <div className="space-y-3">
      {/* AI Generated Insights */}
      <Accordion type="multiple" className="w-full">
        {insights.map((insight) => (
          <AccordionItem
            key={insight.id}
            value={insight.id}
            className="border-none"
          >
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2 text-left">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-semibold text-sm">{insight.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="bg-card/50 rounded-lg p-3 space-y-2">
                <p className="text-sm text-foreground/80">{insight.content}</p>
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

      {/* Search History Comparison */}
      {relatedProducts.length > 0 && (
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="search-history" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2 text-left">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-semibold text-sm">
                  Compare with Previous Searches ({relatedProducts.length})
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <div className="space-y-3">
                {relatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-card/50 rounded-lg p-4 hover:bg-card/70 transition-colors"
                  >
                    {/* Product Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-sm truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              {product.rating && (
                                <div className="flex items-center gap-1">
                                  <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-medium">
                                    {product.rating}
                                  </span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-foreground/60 mt-1">
                              Visited{" "}
                              {new Date(product.visitedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            {product.price && (
                              <p className="text-sm font-bold text-green-500">
                                {product.price}
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 mt-1"
                              onClick={() => window.open(product.url, "_blank")}
                            >
                              <ExternalLinkIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
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
                              {product.aiInsights.pros.slice(0, 2).join(", ")}
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-red-500 min-w-0">
                              ✗
                            </span>
                            <div className="text-xs text-foreground/70 leading-relaxed">
                              {product.aiInsights.cons.slice(0, 2).join(", ")}
                            </div>
                          </div>
                        </div>

                        {/* Features */}
                        {product.features && product.features.length > 0 && (
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
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};
