import { useMemo, useState } from "react";
import placeholderImage from "@/assets/soundcore.png";
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
import {
  ArrowUpRightIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  HistoryIcon,
  StarIcon,
} from "lucide-react";
import { CloudSlashIcon, RobotIcon } from "@phosphor-icons/react";
import type { IndexedProduct, PriceSnapshot, ProductListing } from "@/types";

type DateRange = "day" | "week" | "month" | "all";

interface InsightItem {
  id: string;
  title: string;
  content: string;
  source?: string;
  sourceUrl?: string;
}

interface RelatedProduct {
  id: string;
  name: string;
  image: string;
  url?: string;
  priceLabel?: string;
  lastInteraction: number;
  category: string;
  rating?: number;
  summary?: string;
  recommendation?: string;
  features: string[];
}

interface ProductInsightsTabsProps {
  currentProduct: IndexedProduct | null;
  products: IndexedProduct[];
}

export function ProductInsightsTabs({
  currentProduct,
  products,
}: ProductInsightsTabsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const insights = useMemo<InsightItem[]>(() => {
    if (!currentProduct) return [];

    const items: InsightItem[] = [];

    if (currentProduct.aiSummary) {
      items.push({
        id: `${currentProduct.id}-summary`,
        title: "AI summary",
        content: currentProduct.aiSummary,
        source: "Tabby AI",
        sourceUrl:
          currentProduct.lowestPrice?.url ||
          currentProduct.listings[0]?.url ||
          undefined,
      });
    }

    if (currentProduct.aiRecommendation) {
      items.push({
        id: `${currentProduct.id}-recommendation`,
        title: "Recommendation",
        content: currentProduct.aiRecommendation,
        source: "Tabby AI",
        sourceUrl:
          currentProduct.lowestPrice?.url ||
          currentProduct.listings[0]?.url ||
          undefined,
      });
    }

    return items;
  }, [currentProduct]);

  const historyProducts = useMemo<RelatedProduct[]>(() => {
    return products.map((product) => {
      const image = getPrimaryImage(product) ?? placeholderImage;
      const listing = getPrimaryListing(product);
      const priceLabel = formatPriceSnapshot(
        product.lowestPrice ?? listing
      );

      return {
        id: product.id,
        name: product.mainTitle,
        image,
        url: product.lowestPrice?.url ?? listing?.url,
        priceLabel: priceLabel ?? undefined,
        lastInteraction:
          product.lastViewed ?? product.lastUpdated ?? product.firstSeen ?? Date.now(),
        category: product.category,
        rating:
          typeof product.averageRating === "number"
            ? product.averageRating
            : listing?.rating,
        summary: product.aiSummary,
        recommendation: product.aiRecommendation,
        features: extractFeatureChips(product),
      };
    });
  }, [products]);

  const relatedProducts = useMemo(() => {
    const base = currentProduct
      ? historyProducts.filter(
          (product) =>
            product.id !== currentProduct.id &&
            product.category === currentProduct.category
        )
      : historyProducts;

    const sorted = [...base].sort(
      (a, b) => b.lastInteraction - a.lastInteraction
    );

    return filterProductsByDateRange(sorted, dateRange);
  }, [historyProducts, currentProduct, dateRange]);

  const tabs = [
    {
      label: "AI Insights",
      icon: <RobotIcon size={16} className="mr-1" />,
      value: "insights",
    },
    {
      label: "Previous Products",
      icon: <CloudSlashIcon size={16} className="mr-1" />,
      value: "previous",
    },
  ] as const;

  const dateOptions: Array<{ value: DateRange; label: string }> = [
    { value: "all", label: "All time" },
    { value: "month", label: "Past month" },
    { value: "week", label: "Past week" },
    { value: "day", label: "Past day" },
  ];

  const toggleCardExpansion = (productId: string) => {
    setExpandedCards((prev) => {
      const updated = new Set(prev);
      if (updated.has(productId)) {
        updated.delete(productId);
      } else {
        updated.add(productId);
      }
      return updated;
    });
  };

  return (
    <Tabs defaultValue="insights" className="w-full">
      <TabsList className="grid w-full grid-cols-2 bg-card border border-foreground/5 p-1 h-[50px] rounded-full">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="text-xs data-[state=active]:bg-foreground/5 rounded-full flex items-center justify-center"
          >
            {tab.icon}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

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
                    <div className="w-2 h-2 bg-foreground/50 rounded-full" />
                    <span className="font-semibold text-sm">
                      {insight.title}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="bg-card/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm text-foreground/80">
                      {insight.content}
                    </p>

                    {insight.source && insight.sourceUrl && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-foreground/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">AI</span>
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
                    )}

                    <p className="text-xs text-foreground/50">
                      AI may make mistakes. Validate important details.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-6 border border-dashed border-foreground/10 rounded-xl">
            <RobotIcon size={20} className="mx-auto mb-2 text-foreground/40" />
            <p className="text-sm text-foreground/60">No AI insights yet.</p>
            <p className="text-xs text-foreground/40 mt-1">
              Browse the product for a bit longer to give Tabby more context.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="previous" className="mt-3 space-y-3">
        {relatedProducts.length > 0 ? (
          <>
            <div className="flex justify-end">
              <Select
                value={dateRange}
                onValueChange={(value) => setDateRange(value as DateRange)}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  {dateOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {relatedProducts.map((product) => {
                const isExpanded = expandedCards.has(product.id);

                return (
                  <div
                    key={product.id}
                    className="bg-card/50 rounded-lg border border-foreground/5 hover:bg-card/70 transition-colors"
                  >
                    <button
                      type="button"
                      className="w-full p-4 flex items-center gap-3 text-left"
                      onClick={() => toggleCardExpansion(product.id)}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-foreground/60">
                              {product.priceLabel && (
                                <span className="font-medium text-foreground/70">
                                  {product.priceLabel}
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                <span>
                                  {formatRelativeTime(product.lastInteraction)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs rounded-[10px] hover:bg-foreground/5 transition-colors"
                            onClick={() => {
                              if (product.url) {
                                window.open(
                                  product.url,
                                  "_blank",
                                  "noopener,noreferrer"
                                );
                              }
                            }}
                            disabled={!product.url}
                          >
                            <ArrowUpRightIcon className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>

                        {(product.summary || product.recommendation) && (
                          <div className="space-y-2 text-xs text-foreground/70 leading-relaxed border-t border-foreground/5 pt-3">
                            {product.summary && (
                              <p>
                                <span className="font-medium text-foreground/80">
                                  Summary:
                                </span>{" "}
                                {product.summary}
                              </p>
                            )}
                            {product.recommendation && (
                              <p>
                                <span className="font-medium text-foreground/80">
                                  Recommendation:
                                </span>{" "}
                                {product.recommendation}
                              </p>
                            )}
                          </div>
                        )}

                        {product.rating && (
                          <div className="flex items-center gap-2 text-xs text-foreground/60">
                            <StarIcon className="w-3 h-3" />
                            <span>
                              {product.rating.toFixed(1)} average rating
                            </span>
                          </div>
                        )}

                        {product.features.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            {product.features.slice(0, 6).map((feature) => (
                              <span
                                key={feature}
                                className="text-xs bg-foreground/5 text-foreground/60 px-2 py-0.5 rounded-md"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 border border-dashed border-foreground/10 rounded-xl">
            <HistoryIcon className="w-8 h-8 text-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-foreground/60">
              No related products yet.
            </p>
            <p className="text-xs text-foreground/40 mt-1">
              Browse more items in this category to see comparisons.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function filterProductsByDateRange(products: RelatedProduct[], range: DateRange) {
  if (range === "all") {
    return products.slice(0, 8);
  }

  const now = Date.now();
  let threshold = now;

  if (range === "day") {
    threshold -= 24 * 60 * 60 * 1000;
  } else if (range === "week") {
    threshold -= 7 * 24 * 60 * 60 * 1000;
  } else if (range === "month") {
    threshold -= 30 * 24 * 60 * 60 * 1000;
  }

  return products
    .filter((product) => product.lastInteraction >= threshold)
    .slice(0, 8);
}

function getPrimaryImage(product: IndexedProduct) {
  if (product.primaryImage) return product.primaryImage;
  if (Array.isArray(product.imageGallery) && product.imageGallery.length > 0) {
    return product.imageGallery[0] || undefined;
  }
  const listingWithImage = product.listings.find(
    (listing) => Boolean(listing.imageUrl || listing.thumbnailUrl)
  );
  return listingWithImage?.imageUrl || listingWithImage?.thumbnailUrl || undefined;
}

function getPrimaryListing(product: IndexedProduct): ProductListing | undefined {
  if (product.lowestPrice?.url) {
    return product.listings.find((listing) => listing.url === product.lowestPrice?.url);
  }
  return product.listings.find((listing) => typeof listing.price === "number");
}

function formatPriceSnapshot(
  snapshot?: PriceSnapshot | ProductListing | null
): string | null {
  if (!snapshot) return null;
  const price = (snapshot as PriceSnapshot).price ?? (snapshot as ProductListing).price;
  const currency = (snapshot as PriceSnapshot).currency ?? (snapshot as ProductListing).currency;
  if (typeof price !== "number") return null;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return currency ? `${currency} ${price.toFixed(2)}` : price.toFixed(2);
  }
}

function extractFeatureChips(product: IndexedProduct): string[] {
  const chips: string[] = [];

  if (product.brand) {
    chips.push(product.brand);
  }

  if (product.specifications) {
    for (const [key, value] of Object.entries(product.specifications)) {
      if (chips.length >= 6) break;
      if (typeof value === "string" && value.trim().length > 0 && value.length <= 32) {
        chips.push(value);
      } else if (key.trim().length > 0) {
        chips.push(key);
      }
    }
  }

  return chips;
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp;
  const seconds = Math.max(0, Math.floor(diff / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}
