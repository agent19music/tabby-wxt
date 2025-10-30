import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRightIcon, YoutubeLogo } from "@phosphor-icons/react";

type YoutubeProduct = {
  id: string;
  videoTitle: string;
  channelName: string;
  watchedAt: string; // ISO date
  productName: string;
  productUrl?: string;
  videoUrl: string;
};

const mockYoutubeProducts: YoutubeProduct[] = [
  {
    id: "yt-1",
    videoTitle: "Sony WH-1000XM5 Review: Still the ANC King?",
    channelName: "Tech Sound",
    watchedAt: "2024-01-22",
    productName: "Sony WH-1000XM5",
    productUrl: "https://www.sony.com/headphones/wh-1000xm5",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: "yt-2",
    videoTitle: "iPhone 15 Pro Long-Term Review",
    channelName: "Everyday Tech",
    watchedAt: "2024-01-28",
    productName: "iPhone 15 Pro",
    // no affiliate/product link provided in description
    videoUrl: "https://www.youtube.com/watch?v=3GwjfUFyY6M",
  },
];

function YoutubeProductItem({ item }: { item: YoutubeProduct }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
      className="p-4 bg-card/30 border border-foreground/5 rounded-xl backdrop-blur-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <YoutubeLogo className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold text-foreground truncate">
              {item.videoTitle}
            </h4>
            <button
              className="p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"
              onClick={() => window.open(item.videoUrl, "_blank")}
              title="Open video"
            >
              <ArrowUpRightIcon className="w-3 h-3 text-primary" />
            </button>
          </div>

          <p className="text-xs text-foreground/60 mt-1">
            {item.channelName} • {new Date(item.watchedAt).toLocaleDateString()}
          </p>

          <div className="flex items-center justify-between mt-3">
            <div className="min-w-0">
              <p className="text-xs text-foreground/70 truncate">
                Product: {item.productName}
              </p>
            </div>
            {item.productUrl && (
              <button
                className="px-2 py-1 text-xs rounded-md bg-foreground/5 hover:bg-foreground/10 transition-colors"
                onClick={() => window.open(item.productUrl!, "_blank")}
              >
                View product
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function YoutubeProducts() {
  const items = mockYoutubeProducts;

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-8 text-center text-sm text-foreground/60"
      >
        No YouTube reviewed products yet.
      </motion.div>
    );
  }

  return (
    <div className="px-4 space-y-3">
      {items.map((it) => (
        <YoutubeProductItem key={it.id} item={it} />
      ))}
    </div>
  );
}
