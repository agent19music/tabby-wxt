import { useMemo, useState } from "react";
import soundcore from "@/assets/soundcore.png";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ShoppingBagIcon,
  StarIcon,
} from "lucide-react";
import { ProductInsightsTabs } from "./ProductInsightsTabs";
import { useStorageValue } from "@/hooks/use-storage-value";
import { addToCart } from "@/utils/storage";
import type { IndexedProduct, PriceSnapshot, ProductListing } from "@/types";

export const CurrentProductCard = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const currentProduct = useStorageValue("currentProduct");
  const indexedProducts = useStorageValue("indexedProducts");

  const productTitle = currentProduct?.mainTitle ?? "No product captured yet";
  const productImage = useMemo(() => getPrimaryImage(currentProduct), [currentProduct]);
  const primaryListing = useMemo(() => getPrimaryListing(currentProduct), [currentProduct]);
  const productUrl = useMemo(() => {
    if (!currentProduct) return undefined;
    return (
      currentProduct.lowestPrice?.url ||
      primaryListing?.url ||
      currentProduct.listings.find((listing) => Boolean(listing.url))?.url
    );
  }, [currentProduct, primaryListing]);
  const priceLabel = useMemo(() => {
    if (!currentProduct) return "";
    return (
      formatPriceSnapshot(currentProduct.lowestPrice) ||
      formatPriceSnapshot(primaryListing) ||
      ""
    );
  }, [currentProduct, primaryListing]);
  const description = useMemo(() => {
    if (currentProduct?.aiSummary) return currentProduct.aiSummary;
    if (currentProduct?.aiRecommendation) return currentProduct.aiRecommendation;
    return "Browse a product page to let Tabby capture details automatically.";
  }, [currentProduct]);
  const ratingLabel = useMemo(() => getRatingLabel(currentProduct), [currentProduct]);

  const selectedListingUrl = primaryListing?.url;
  const hasProduct = Boolean(currentProduct && currentProduct.id);

  async function handleAddToCart() {
    if (!hasProduct || !selectedListingUrl || !currentProduct) return;

    try {
      setIsAdding(true);
      await addToCart(currentProduct.id, selectedListingUrl);
    } catch (error) {
      console.error("[CurrentProductCard] Failed to add to cart", error);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="bg-card rounded-[20px] backdrop-blur-3xl border border-foreground/5 hover:border-foreground/10 transition-colors overflow-hidden">
      <div
        className="p-4 cursor-pointer rounded-t-[20px]"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <img
              src={productImage ?? soundcore}
              alt={productTitle}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold truncate">{productTitle}</h1>
                  {priceLabel && (
                    <span className="text-lg font-bold">{priceLabel}</span>
                  )}
                </div>
                <p className="text-sm text-foreground/70 mt-1 line-clamp-3">
                  {description}
                </p>
                {ratingLabel && (
                  <div className="flex items-center gap-1 text-xs text-foreground/60 mt-2">
                    <StarIcon className="w-3 h-3" />
                    <span>{ratingLabel}</span>
                  </div>
                )}
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

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="flex gap-2 justify-end">
            <button
              className="p-2 bg-foreground/5 backdrop-blur-3xl hover:bg-foreground/5 rounded-full transition-colors disabled:opacity-40"
              disabled={!hasProduct || !selectedListingUrl || isAdding}
              title={hasProduct ? "Add to cart" : "Open a product to enable"}
              onClick={handleAddToCart}
            >
              <ShoppingBagIcon
                size={18}
                className={isAdding ? "animate-pulse" : undefined}
              />
            </button>
            <button
              className="p-2 bg-foreground/5 backdrop-blur-3xl hover:bg-foreground/5 rounded-full transition-colors disabled:opacity-40"
              disabled={!productUrl}
              onClick={() => {
                if (productUrl) {
                  window.open(productUrl, "_blank", "noopener,noreferrer");
                }
              }}
              title={productUrl ? "Open product" : "Link unavailable"}
            >
              <ArrowUpRightIcon size={18} />
            </button>
          </div>

          <div className="border-t border-foreground/5 pt-4">
            <ProductInsightsTabs
              currentProduct={currentProduct ?? null}
              products={indexedProducts}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function getPrimaryImage(product: IndexedProduct | null | undefined) {
  if (!product) return undefined;
  if (product.primaryImage) return product.primaryImage;
  if (Array.isArray(product.imageGallery) && product.imageGallery.length > 0) {
    return product.imageGallery[0] || undefined;
  }
  const listingWithImage = product.listings.find(
    (listing) => Boolean(listing.imageUrl || listing.thumbnailUrl)
  );
  return listingWithImage?.imageUrl || listingWithImage?.thumbnailUrl || undefined;
}

function getPrimaryListing(product: IndexedProduct | null | undefined):
  | ProductListing
  | undefined {
  if (!product) return undefined;
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

function getRatingLabel(product: IndexedProduct | null | undefined) {
  if (!product) return undefined;
  if (typeof product.averageRating === "number") {
    return `${product.averageRating.toFixed(1)} average rating`;
  }

  const listing = product.listings.find((entry) => typeof entry.rating === "number");
  if (listing?.rating) {
    return `${listing.rating.toFixed(1)} rating on ${listing.site}`;
  }

  return undefined;
}
