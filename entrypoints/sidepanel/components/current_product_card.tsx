import React, { useState } from "react";
import soundcore from "@/assets/soundcore.png";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ShoppingBagIcon,
  ArrowUpRightIcon,
} from "lucide-react";
import { ProductInsightsTabs } from "./ProductInsightsTabs";

type Props = {};

export const CurrentProductCard = (props: Props) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Mock data - replace with actual data from your state management
  const currentProduct = {
    name: "Soundcore Space Q45",
    url: "https://www.soundcore.com/products/space-q45",
    category: "headphones",
    price: "$149.99",
    rating: 4.5,
  };

  const aiInsights = [
    {
      id: "recommendation-1",
      type: "recommendation" as const,
      title: "Recommended for",
      content:
        "Ideal for frequent travelers and remote workers who need to block out background noise while maintaining wireless connectivity and comfort during long listening sessions.",
      source: "www.soundcore.com",
      sourceUrl: "https://www.soundcore.com/products/space-q45",
    },
    {
      id: "tip-1",
      type: "tip" as const,
      title: "Helpful tip",
      content:
        "Express shipping is only available for users who are registered and logged in, so ensure you have an account and are signed in to access faster delivery options.",
      source: "www.soundcore.com",
      sourceUrl: "https://www.soundcore.com/products/space-q45",
    },
  ];

  const searchHistory = [
    {
      id: "1",
      name: "Sony WH-1000XM5",
      image: soundcore, // Replace with actual image
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
      image: soundcore, // Replace with actual image
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
      image: soundcore, // Replace with actual image
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
    <div className="bg-card rounded-[20px] backdrop-blur-3xl border border-foreground/5 hover:border-foreground/10 transition-colors overflow-hidden">
      <div
        className="p-4 cursor-pointer rounded-t-[20px]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <img
              src={soundcore}
              alt={currentProduct.name}
              className="w-12 h-12 rounded-lg"
            />
            <div className="flex-1">
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold">{currentProduct.name}</h1>
                  <span className="text-lg font-bold">
                    {currentProduct.price}
                  </span>
                </div>
                <p className="text-sm text-foreground/70 mt-1">
                  Premium noise-canceling headphones with exceptional sound
                  quality
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-foreground/5 rounded-full transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <button className="p-2 bg-foreground/5 backdrop-blur-3xl hover:bg-foreground/5 rounded-full transition-colors">
              <ShoppingBagIcon size={18} />
            </button>
            <button className="p-2 bg-foreground/5 backdrop-blur-3xl hover:bg-foreground/5 rounded-full transition-colors">
              <ArrowUpRightIcon size={18} />
            </button>
          </div>

          {/* AI Insights & Previous Products */}
          <div className="border-t border-foreground/5 pt-4">
            <ProductInsightsTabs
              insights={aiInsights}
              searchHistory={searchHistory}
              currentProduct={currentProduct}
            />
          </div>

          {/* Most Recommended */}
          <div className="border-t border-foreground/5 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2  font-semibold rounded-full"></div>
              <h3 className="font-semibold text-sm">Most Recommended</h3>
            </div>
            <div className="bg-input backdrop-blur-3xl  p-3 rounded-[24px] border border-foreground/5">
              <p className="text-xs text-foreground/70 leading-relaxed mb-2">
                Based on your browsing history and preferences, the{" "}
                <span className="font-medium text-foreground">
                  Sony WH-1000XM5
                </span>{" "}
                is the most recommended option for you. It offers superior noise
                cancellation and sound quality, perfect for your travel needs.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={soundcore}
                    alt="Sony WH-1000XM5"
                    className="w-8 h-8 rounded"
                  />
                  <div>
                    <p className="text-xs font-medium">Sony WH-1000XM5</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      $399.99
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs rounded-[10px]"
                  onClick={() =>
                    window.open(
                      "https://www.sony.com/headphones/wh-1000xm5",
                      "_blank"
                    )
                  }
                >
                  View
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
