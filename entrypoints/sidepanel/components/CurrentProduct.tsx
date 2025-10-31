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
import { createSummary, isSummarizerAvailable } from "@/components/functions/current_product/summarise_ai";
import { getAllProducts } from "@/components/functions/db/products_site_storage";
import type { Product } from "@/components/types/db";

interface PageContent {
  title: string;
  url: string;
  text: string;
  headings: string[];
  images?: string[];
  timestamp: number;
}

export default function CurrentProduct() {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizerAvailable, setSummarizerAvailable] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

  useEffect(() => {
    // Check if summarizer is available
    isSummarizerAvailable().then(setSummarizerAvailable);

    // Get current tab URL and product
    const fetchCurrentProduct = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        setCurrentUrl(tab.url);
        
        // Fetch product from storage
        const allProducts = await getAllProducts();
        const product = allProducts.find(p => p.url === tab.url);
        setCurrentProduct(product || null);
      }
    };

    fetchCurrentProduct();

    // Listen for URL changes
    const handleTabUpdate = (tabId: number, changeInfo: any) => {
      if (changeInfo.url) {
        fetchCurrentProduct();
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdate);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  const handleCreateSummary = async () => {
    try {
      setIsSummarizing(true);
      setSummary(null);

      if (!currentProduct) {
        alert('No product data found for this page');
        return;
      }

      // Create text to summarize
      const textToSummarize = `
Title: ${currentProduct.title}

Price: ${currentProduct.price || 'N/A'}

Category: ${currentProduct.category}

Summary: ${currentProduct.summary || 'No summary available'}

${currentProduct.pros ? 'Pros:\n- ' + currentProduct.pros.join('\n- ') : ''}

${currentProduct.cons ? 'Cons:\n- ' + currentProduct.cons.join('\n- ') : ''}
      `.trim();

      // Generate summary
      const generatedSummary = await createSummary(textToSummarize, {
        type: 'key-points',
        format: 'markdown',
        length: 'medium',
        sharedContext: `This is a product summary for: ${currentProduct.title}`
      });

      setSummary(generatedSummary);
    } catch (error) {
      console.error('Error creating summary:', error);
      alert(`Failed to create summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content area - product card, buttons, summary, and chat messages */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 max-w-[350px] mx-auto">
          <CurrentProductCard />
          
          <div className="my-3 rounded-lg space-y-2 flex flex-col items-end justify-end">
            <Button 
              variant="outline" 
              className="w-fit text-muted-foreground"
              onClick={handleCreateSummary}
              disabled={isSummarizing || !summarizerAvailable}
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating summary...
                </>
              ) : (
                'Create summary of this product'
              )}
            </Button>
          </div>
          
          {/* Display Summary */}
          {summary && (
            <div className="my-3 bg-card rounded-lg border border-foreground/5 p-4">
              <h3 className="font-semibold text-sm mb-2">AI Summary</h3>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
              </div>
            </div>
          )}

          {/* Chat Messages Area - grows upward as messages are added */}
          {currentProduct && (
            <CurrentProductChat product={currentProduct} />
          )}
        </div>
      </div>
    </div>
  );
}
