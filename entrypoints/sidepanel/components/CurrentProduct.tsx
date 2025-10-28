import { useEffect, useState } from "react";
import {
  Loader2,
  Globe,
  Clock,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrentProductCard } from "./current_product_card";
import { CurrentProductChat } from "./current_product_chat";

interface PageContent {
  title: string;
  url: string;
  text: string;
  headings: string[];
  images?: string[];
  timestamp: number;
}

export default function CurrentProduct() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4">
          <CurrentProductCard />
        </div>
      </div>
      <div className="sticky bottom-0 z-10 px-4 bg-background">
        <CurrentProductChat />
      </div>
    </div>
  );
}
