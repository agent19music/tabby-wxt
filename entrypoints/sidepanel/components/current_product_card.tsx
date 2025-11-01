import React, { useState, useEffect } from "react";
import soundcore from "@/assets/soundcore.png";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ShoppingBagIcon,
  ArrowUpRightIcon,
  Loader2,
  VideoIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { ProductInsightsTabs } from "./ProductInsightsTabs";
import { getProductByUrl, type UIProduct } from "@/components/functions/db/products_fetch";
import { Product, YoutubeReview } from "@/components/types/db";
import { getAllProducts } from "@/components/functions/db/products_site_storage";
import { findRelatedProducts, type RecommendationResult } from "@/components/functions/current_product/related_products";
import { getLinkedReviewsForProduct } from "@/components/functions/db/youtube_product_linker";

type Props = {};

export const CurrentProductCard = (props: Props) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [showProcessingHint, setShowProcessingHint] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendationResult | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [linkedReviews, setLinkedReviews] = useState<YoutubeReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);

  useEffect(() => {
    // Get current tab URL on mount
    const getCurrentTabUrl = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url) {
          console.log("Initial tab URL:", tab.url);
          setCurrentUrl(tab.url);
        }
      } catch (error) {
        console.error("Failed to get current tab URL:", error);
        setIsLoading(false);
      }
    };

    getCurrentTabUrl();

    // Listen for tab updates (URL changes within same tab)
    const handleTabUpdate = (tabId: number, changeInfo: any, tab: chrome.tabs.Tab) => {
      chrome.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
        if (activeTab && activeTab.id === tabId && changeInfo.url) {
          console.log("Tab updated to:", changeInfo.url);
          setIsLoading(true);
          setCurrentUrl(changeInfo.url);
        }
      });
    };

    // Listen for tab activation (switching between tabs)
    const handleTabActivated = (activeInfo: { tabId: number; windowId: number }) => {
      chrome.tabs.get(activeInfo.tabId).then((tab) => {
        if (tab.url) {
          console.log("Tab activated:", tab.url);
          setIsLoading(true);
          setCurrentUrl(tab.url);
        }
      });
    };

    // Listen for Chrome storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      console.log("Storage changed:", areaName, "Keys:", Object.keys(changes));
      // Check if products, url_to_product, or site_visits were updated (any could indicate new product)
      if (areaName === 'local' && (changes['products'] || changes['url_to_product'] || changes['site_visits'])) {
        console.log("Product-related storage updated, refreshing current product...");
        // Force refresh by incrementing trigger
        setRefreshTrigger(prev => prev + 1);
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Separate effect to handle URL changes and refresh trigger
  useEffect(() => {
    if (currentUrl) {
      console.log("Fetching product for URL:", currentUrl, "trigger:", refreshTrigger);
      setIsLoading(true); // Set loading state when URL changes
      setShowProcessingHint(false);
      
      const fetchProduct = async () => {
        try {
          const products = await getAllProducts();
          setAllProducts(products);
          console.log("All products:", products.length);
          const product = products.find(p => p.url === currentUrl);
          console.log("Found product:", product ? product.title : "none");
          setCurrentProduct(product || null);
          
          // If no product found, show processing hint after 2 seconds
          if (!product) {
            setTimeout(() => {
              setShowProcessingHint(true);
            }, 2000);
          }
        } catch (error) {
          console.error("Failed to fetch product:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchProduct();
    }
  }, [currentUrl, refreshTrigger]);

  // Effect to find related products when current product changes
  useEffect(() => {
    if (currentProduct && !isLoading) {
      const fetchRelatedProducts = async () => {
        try {
          setIsLoadingRecommendations(true);
          
          const result = await findRelatedProducts(
            currentProduct.id,
            currentProduct.title,
            currentProduct.category,
            currentProduct.summary,
            allProducts.map(p => ({
              id: p.id,
              title: p.title,
              category: p.category,
              summary: p.summary,
              price: p.price,
            }))
          );
          
          setRecommendations(result);
        } catch (error) {
          console.error('Error fetching related products:', error);
          setRecommendations(null);
        } finally {
          setIsLoadingRecommendations(false);
        }
      };

      fetchRelatedProducts();
    } else {
      setRecommendations(null);
    }
  }, [currentProduct, isLoading]);

  // Effect to fetch linked YouTube reviews
  useEffect(() => {
    if (currentProduct && !isLoading) {
      const fetchLinkedReviews = async () => {
        try {
          setIsLoadingReviews(true);
          const reviews = await getLinkedReviewsForProduct(currentProduct.id);
          setLinkedReviews(reviews);
          console.log(`[CurrentProductCard] Found ${reviews.length} linked YouTube reviews`);
        } catch (error) {
          console.error('Error fetching linked reviews:', error);
          setLinkedReviews([]);
        } finally {
          setIsLoadingReviews(false);
        }
      };

      fetchLinkedReviews();
    } else {
      setLinkedReviews([]);
    }
  }, [currentProduct, isLoading]);

  // Convert product pros/cons to aiInsights format
  const aiInsights = currentProduct && !isLoading ? [
    ...(currentProduct.pros && currentProduct.pros.length > 0 ? [{
      id: "pros",
      type: "recommendation" as const,
      title: "Pros",
      content: currentProduct.pros.join(", "),
      source: new URL(currentProduct.url).hostname,
      sourceUrl: currentProduct.url,
    }] : []),
    ...(currentProduct.cons && currentProduct.cons.length > 0 ? [{
      id: "cons",
      type: "tip" as const,
      title: "Cons",
      content: currentProduct.cons.join(", "),
      source: new URL(currentProduct.url).hostname,
      sourceUrl: currentProduct.url,
    }] : []),
  ] : [];

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-[20px] backdrop-blur-3xl border border-foreground/5 overflow-hidden">
        <div className="p-4 flex items-center justify-center min-h-[120px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not a product page or not in database
  if (!currentProduct) {
    return (
      <div className="bg-card rounded-[20px] backdrop-blur-3xl border border-foreground/5 overflow-hidden">
        <div className="p-4 flex items-center justify-center min-h-[120px]">
          <div className="flex flex-col items-center gap-2 text-center">
            {showProcessingHint ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Processing page...
                </p>
                <p className="text-xs text-muted-foreground/70">
                  This may take a few seconds. The card will update automatically when ready.
                </p>
              </>
            ) : (
              <>
                <ShoppingBagIcon className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No product data available
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mock search history (you can replace this with real data later)
  const searchHistory = [
    {
      id: "1",
      name: "Sony WH-1000XM5",
      image: soundcore,
      url: "https://www.sony.com/headphones/wh-1000xm5",
      price: "$399.99",
      visitedAt: "2024-01-15",
      category: "headphones",
      rating: 4.8,
      aiInsights: {
        pros: [
          "Industry-leading noise cancellation",
          "Exceptional sound quality",
          "30-hour battery life",
          "Comfortable for long sessions",
        ],
        cons: [
          "Premium price point",
          "Can feel heavy after hours",
          "Touch controls can be sensitive",
        ],
        bestFor: "Professional travelers and audiophiles",
        comparison:
          "Superior noise cancellation vs Soundcore, but 2.5x more expensive",
      },
      features: ["ANC", "Wireless", "Hi-Res Audio", "Quick Charge"],
    },
    {
      id: "2",
      name: "Bose QuietComfort 45",
      image: soundcore,
      url: "https://www.bose.com/quietcomfort-45",
      price: "$329.00",
      visitedAt: "2024-01-10",
      category: "headphones",
      rating: 4.6,
      aiInsights: {
        pros: [
          "Excellent comfort and build quality",
          "Great noise cancellation",
          "Reliable connectivity",
          "Good battery life",
        ],
        cons: [
          "Sound quality not as detailed",
          "Limited customization options",
          "Bulkier design",
        ],
        bestFor: "Comfort-focused users and business professionals",
        comparison:
          "Better comfort than Soundcore, similar price range with premium brand",
      },
      features: ["ANC", "Wireless", "Comfort", "Reliable"],
    },
    {
      id: "3",
      name: "Sennheiser HD 660S",
      image: soundcore,
      url: "https://www.sennheiser.com/hd-660-s",
      price: "$499.95",
      visitedAt: "2024-01-08",
      category: "headphones",
      rating: 4.7,
      aiInsights: {
        pros: [
          "Outstanding audio fidelity",
          "Open-back design for natural sound",
          "Premium build materials",
          "Excellent for music production",
        ],
        cons: [
          "No noise isolation",
          "Requires amplifier",
          "Not portable",
          "Expensive",
        ],
        bestFor: "Audiophiles and music professionals",
        comparison:
          "Superior sound quality but wired-only, 3x more expensive than Soundcore",
      },
      features: ["Open-back", "Hi-Fi", "Wired", "Studio Grade"],
    },
    {
      id: "4",
      name: "Apple AirPods Pro 2",
      image: soundcore,
      url: "https://www.apple.com/airpods-pro",
      price: "$249.00",
      visitedAt: "2024-01-05",
      category: "headphones",
      rating: 4.5,
      aiInsights: {
        pros: [
          "Excellent noise cancellation",
          "Seamless Apple ecosystem integration",
          "Compact and portable",
          "Great call quality",
        ],
        cons: [
          "Expensive for earbuds",
          "Limited battery life",
          "Not ideal for Android users",
        ],
        bestFor: "iPhone users and mobile professionals",
        comparison:
          "Better integration than Soundcore for Apple users, similar price",
      },
      features: ["ANC", "Wireless", "Apple Integration", "Portable"],
    },
    {
      id: "5",
      name: "JBL Live Pro 2",
      image: soundcore,
      url: "https://www.jbl.com/live-pro-2",
      price: "$149.99",
      visitedAt: "2024-01-03",
      category: "headphones",
      rating: 4.3,
      aiInsights: {
        pros: [
          "Good sound quality",
          "Comfortable fit",
          "Decent battery life",
          "Affordable price",
        ],
        cons: [
          "Average noise cancellation",
          "Build quality could be better",
          "Limited features",
        ],
        bestFor: "Budget-conscious users and casual listeners",
        comparison:
          "Similar price to Soundcore but inferior noise cancellation",
      },
      features: ["ANC", "Wireless", "Budget", "Comfortable"],
    },
    {
      id: "6",
      name: "Sony WF-1000XM4",
      image: soundcore,
      url: "https://www.sony.com/wf-1000xm4",
      price: "$279.99",
      visitedAt: "2024-01-01",
      category: "headphones",
      rating: 4.4,
      aiInsights: {
        pros: [
          "Great noise cancellation",
          "Excellent sound quality",
          "Long battery life",
          "Premium build",
        ],
        cons: ["Can be uncomfortable for some", "Expensive", "Large case size"],
        bestFor: "Audiophiles who prefer earbuds",
        comparison: "Better sound than Soundcore but more expensive",
      },
      features: ["ANC", "Wireless", "Hi-Res", "Premium"],
    },
    {
      id: "7",
      name: "Bose QuietComfort Earbuds",
      image: soundcore,
      url: "https://www.bose.com/quietcomfort-earbuds",
      price: "$279.00",
      visitedAt: "2023-12-28",
      category: "headphones",
      rating: 4.2,
      aiInsights: {
        pros: [
          "Excellent noise cancellation",
          "Comfortable fit",
          "Good sound quality",
          "Reliable brand",
        ],
        cons: ["Expensive", "Large earbuds", "Limited customization"],
        bestFor: "Comfort-focused users and frequent travelers",
        comparison: "Better comfort than Soundcore but higher price",
      },
      features: ["ANC", "Wireless", "Comfort", "Reliable"],
    },
    {
      id: "8",
      name: "Sennheiser Momentum True Wireless 3",
      image: soundcore,
      url: "https://www.sennheiser.com/momentum-true-wireless-3",
      price: "$199.95",
      visitedAt: "2023-12-25",
      category: "headphones",
      rating: 4.6,
      aiInsights: {
        pros: [
          "Outstanding sound quality",
          "Premium materials",
          "Good battery life",
          "Comfortable fit",
        ],
        cons: ["Expensive", "Average noise cancellation", "Large case"],
        bestFor: "Sound quality enthusiasts",
        comparison: "Superior sound quality to Soundcore but more expensive",
      },
      features: ["Hi-Fi", "Wireless", "Premium", "Sound Quality"],
    },
  ];

  return (
    <div className="bg-card rounded-2xl backdrop-blur-sm border border-border/50 hover:border-border transition-all duration-200 overflow-hidden shadow-sm">
      <div
        className="p-5 cursor-pointer rounded-t-2xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <img
              src={currentProduct.image || soundcore}
              alt={currentProduct.title}
              className="w-14 h-14 rounded-xl object-cover border border-border/30"
            />
            <div className="flex-1">
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold">{currentProduct.title}</h1>
                  <span className="text-lg font-bold">
                    {currentProduct.price || "N/A"}
                  </span>
                </div>
                {currentProduct.summary && (
                  <p className="text-sm text-foreground/70 mt-1">
                    {currentProduct.summary}
                  </p>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-foreground/5 rounded-xl transition-all duration-200"
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4 text-foreground/60" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-foreground/60" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <button className="p-2.5 bg-foreground/5 backdrop-blur-sm hover:bg-foreground/10 rounded-xl transition-all duration-200">
              <ShoppingBagIcon size={18} />
            </button>
            <button 
              className="p-2.5 bg-foreground/5 backdrop-blur-sm hover:bg-foreground/10 rounded-xl transition-all duration-200"
              onClick={() => window.open(currentProduct.url, '_blank')}
            >
              <ArrowUpRightIcon size={18} />
            </button>
          </div>

          {/* AI Insights & Previous Products */}
          <div className="border-t border-foreground/5 pt-4">
            <ProductInsightsTabs
              insights={aiInsights}
              searchHistory={searchHistory}
              currentProduct={{
                name: currentProduct.title,
                url: currentProduct.url,
                category: currentProduct.category,
              }}
              relatedProductIds={recommendations?.relatedProducts.map(p => p.id) || []}
              allProducts={allProducts.map(p => ({
                id: p.id,
                title: p.title,
                image: p.image,
                url: p.url,
                price: p.price,
                category: p.category,
              }))}
            />
          </div>

          {/* YouTube Reviews */}
          {linkedReviews.length > 0 && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
                <h3 className="font-semibold text-sm">YouTube Reviews You Watched</h3>
              </div>
              <div className="space-y-3">
                {linkedReviews.map((review) => {
                  // Get product data from review (match by canonical name)
                  const reviewProduct = review.review_type === "single_review" 
                    ? { name: review.product_name, pros: review.pros, cons: review.cons, verdict: review.verdict }
                    : review.products?.find(p => 
                        // Match canonical names (case-insensitive)
                        p.canonical_product_name?.toLowerCase() === currentProduct.canonical_name.toLowerCase() ||
                        p.product_name.toLowerCase().includes(currentProduct.canonical_name.toLowerCase()) ||
                        currentProduct.canonical_name.toLowerCase().includes(p.canonical_product_name?.toLowerCase() || '')
                      );

                  return (
                    <div key={review.id} className="bg-input backdrop-blur-sm p-4 rounded-2xl border border-border/50 hover:border-border transition-colors">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          <VideoIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium mb-1 truncate">{review.video_title}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{review.channel_name}</p>
                          
                          {reviewProduct && (
                            <div className="space-y-2 mb-3">
                              {reviewProduct.pros && reviewProduct.pros.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <ThumbsUpIcon className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-foreground/80 line-clamp-2">
                                    {reviewProduct.pros.slice(0, 2).join(", ")}
                                  </p>
                                </div>
                              )}
                              {reviewProduct.cons && reviewProduct.cons.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <ThumbsDownIcon className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-foreground/80 line-clamp-2">
                                    {reviewProduct.cons.slice(0, 2).join(", ")}
                                  </p>
                                </div>
                              )}
                              {reviewProduct.verdict && (
                                <p className="text-xs text-foreground/70 italic line-clamp-2">
                                  "{reviewProduct.verdict}"
                                </p>
                              )}
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs rounded-lg gap-1"
                            onClick={() => window.open(`https://youtube.com/watch?v=${review.video_id}`, '_blank')}
                          >
                            <ExternalLinkIcon className="w-3 h-3" />
                            Watch Review
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Most Recommended */}
          {recommendations?.mostRecommended && (
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-2 h-2 bg-[#30d158] rounded-full shadow-sm"></div>
                <h3 className="font-semibold text-sm">Most Recommended</h3>
              </div>
              <div className="bg-input backdrop-blur-sm p-4 rounded-2xl border border-border/50">
                <p className="text-xs text-foreground/70 leading-relaxed mb-2">
                  {recommendations.mostRecommended.reason}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={soundcore}
                      alt={recommendations.mostRecommended.name}
                      className="w-8 h-8 rounded"
                    />
                    <div>
                      <p className="text-xs font-medium">{recommendations.mostRecommended.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">
                        Relevance: {recommendations.mostRecommended.relevanceScore}%
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-xs rounded-[10px]"
                    onClick={() => {
                      // Find the full product data
                      getAllProducts().then(products => {
                        const product = products.find(p => p.id === recommendations.mostRecommended?.id);
                        if (product?.url) {
                          window.open(product.url, "_blank");
                        }
                      });
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
