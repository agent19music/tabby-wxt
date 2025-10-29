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
      <div className="flex-1 overflow-y-auto flex justify-end">
        <div className="px-4 max-w-[350px]">
          <CurrentProductCard />
          <div className="my-3 rounded-lg space-y-2 flex flex-col items-end justify-end">
            <Button variant="outline" className="w-fit  text-muted-foreground">
              Create summary of this product
            </Button>
            <Button variant="outline" className="w-fit  text-muted-foreground">
              Ask Gemini
            </Button>
          </div>
        </div>
      </div>
      <div className="sticky bottom-0 z-10 px-4 bg-background">
        <CurrentProductChat />
      </div>
    </div>
  );
}
