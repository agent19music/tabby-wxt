import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, YoutubeLogo, ThumbsUp, ThumbsDown, Minus, CaretDown, ShoppingCart } from "@phosphor-icons/react";
import type { YoutubeReview } from "@/components/functions/db.types";
import { getAllYoutubeReviews } from "@/components/functions/db/youtube_storage";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ShoppingBagOpenIcon, ThumbsUpIcon,ThumbsDownIcon,SmileyMehIcon,SmileyIcon,SmileySadIcon } from "@phosphor-icons/react";

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return <SmileyIcon className="w-4 h-4 text-green-500"  />;
    case "negative":
      return <SmileySadIcon className="w-4 h-4 text-red-500"  />;
    default:
      return <SmileyMehIcon className="w-4 h-4 text-yellow-500" />;
  }
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "negative":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  }
}

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function YoutubeProductItem({ item }: { item: YoutubeReview }) {
  return (
    <AccordionItem value={item.id} className="border-none">
      <motion.div
        whileHover={{ scale: 1.005 }}
        className="bg-card/30 border border-foreground/5 rounded-xl backdrop-blur-sm overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div>.caret]:rotate-180">
          <div className="flex items-start gap-3 w-full min-w-0">
            <img 
              src={item.thumbnail_url} 
              alt={item.video_title}
              className="w-20 h-12 object-cover rounded-md flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-left overflow-hidden">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <YoutubeLogo className="w-4 h-4 text-red-500 flex-shrink-0" weight="fill" />
                <h4 className="text-sm font-semibold text-foreground break-words line-clamp-2 flex-1 min-w-0">
                  {item.product_name}
                </h4>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink-0 ${getSentimentColor(item.overall_sentiment)}`}>
                  {getSentimentIcon(item.overall_sentiment)}
                </div>
              </div>
              <p className="text-xs text-foreground/60 break-words line-clamp-2">
                {item.video_title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <p className="text-xs text-foreground/50 truncate max-w-[120px]">
                  {item.channel_name}
                </p>
                <span className="text-xs text-foreground/30">•</span>
                <p className="text-xs text-foreground/50 whitespace-nowrap">
                  {new Date(item.watched_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <CaretDown className="caret w-4 h-4 text-foreground/40 transition-transform duration-200 flex-shrink-0 mt-1" />
          </div>
        </AccordionTrigger>
        
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-3 pt-2">
            {/* Category Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatCategoryName(item.product_category)}
              </Badge>
            </div>

            {/* Review Summary */}
            {item.review_summary && (
              <div>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {item.review_summary}
                </p>
              </div>
            )}

            {/* Pros */}
            {item.pros && item.pros.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ThumbsUpIcon className="w-3.5 h-3.5 text-green-500"  />
                  <h5 className="text-xs font-semibold text-green-500">Pros</h5>
                </div>
                <ul className="space-y-1 ml-5">
                  {item.pros.map((pro, idx) => (
                    <li key={idx} className="text-xs text-foreground/70 list-disc">
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons */}
            {item.cons && item.cons.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ThumbsDown className="w-3.5 h-3.5 text-red-500" weight="fill" />
                  <h5 className="text-xs font-semibold text-red-500">Cons</h5>
                </div>
                <ul className="space-y-1 ml-5">
                  {item.cons.map((con, idx) => (
                    <li key={idx} className="text-xs text-foreground/70 list-disc">
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Affiliate Links */}
            {item.affiliate_links && item.affiliate_links.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ShoppingBagOpenIcon className="w-3.5 h-3.5 text-primary"  />
                  <h5 className="text-xs font-semibold text-foreground">Buy from</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.affiliate_links.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => window.open(link.url, "_blank")}
                      className="px-3 py-1.5 text-xs rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5"
                    >
                      {link.retailer}
                      <ArrowUpRightIcon className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Watch Video Button */}
            <button
              onClick={() => window.open(item.video_url, "_blank")}
              className="w-full px-3 py-2 text-xs rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center justify-center gap-2"
            >
              <YoutubeLogo className="w-4 h-4" weight="fill" />
              Watch Full Review
              <ArrowUpRightIcon className="w-3 h-3" />
            </button>
          </div>
        </AccordionContent>
      </motion.div>
    </AccordionItem>
  );
}

export default function YoutubeProducts() {
  const [reviews, setReviews] = useState<YoutubeReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[YouTube Products UI] Component mounted, loading reviews...");
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      console.log("[YouTube Products UI] Fetching YouTube reviews...");
      const data = await getAllYoutubeReviews();
      console.log(`[YouTube Products UI] Received ${data.length} reviews:`, data);
      setReviews(data);
      console.log("[YouTube Products UI] ✅ State updated with reviews");
    } catch (error) {
      console.error("[YouTube Products UI] ❌ Failed to load YouTube reviews:", error);
      console.error("[YouTube Products UI] Error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      setLoading(false);
      console.log("[YouTube Products UI] Loading complete");
    }
  }

  if (loading) {
    console.log("[YouTube Products UI] Rendering loading state...");
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-8 text-center text-sm text-foreground/60"
      >
        Loading reviews...
      </motion.div>
    );
  }

  if (reviews.length === 0) {
    console.log("[YouTube Products UI] Rendering empty state (no reviews found)");
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-8 text-center text-sm text-foreground/60"
      >
        No YouTube product reviews yet. Watch a product review on YouTube to get started!
      </motion.div>
    );
  }
  
  console.log(`[YouTube Products UI] Rendering ${reviews.length} reviews`);

  return (
    <div className="px-4 pt-4 space-y-3">
      <Accordion type="single" collapsible className="space-y-3">
        {reviews.map((review) => (
          <YoutubeProductItem key={review.id} item={review} />
        ))}
      </Accordion>
    </div>
  );
}
