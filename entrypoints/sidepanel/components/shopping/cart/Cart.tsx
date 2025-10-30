import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  ExternalLinkIcon,
  TagIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getCartItems,
  removeFromCart,
  updateCartQuantity,
  type CartProduct,
} from "@/components/functions/cart_handling";

// Cart Item Component
const CartItem: React.FC<{
  item: CartProduct;
  onRemove: (id: string) => void;
}> = ({ item, onRemove }) => {
  const [isDescOpen, setIsDescOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="p-4 bg-card rounded-2xl border border-foreground/5 hover:border-foreground/10 backdrop-blur-sm transition-all duration-200"
    >
      <div className="flex items-start gap-3 w-full">
        <div className="relative shrink-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center">
              <TagIcon className="w-6 h-6 text-foreground/30" />
            </div>
          )}
          {item.visitCount && item.visitCount > 1 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-foreground rounded-full flex items-center justify-center">
              <span className="text-[9px] font-semibold text-background">
                {item.visitCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Title and Actions */}
          <div className="flex items-start justify-between gap-2 w-full">
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-sm text-foreground line-clamp-2">
                {item.name}
              </h5>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-foreground">
                  {item.originalPrice || `$${item.price.toFixed(2)}`}
                </span>
                {item.quantity > 1 && (
                  <span className="text-xs text-foreground/60">
                    × {item.quantity}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <button
                className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-colors"
                onClick={() => window.open(item.url, "_blank")}
                title="Open product page"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </button>
              <button
                className="p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full transition-colors"
                onClick={() => onRemove(item.id)}
                title="Remove from cart"
              >
                <Trash2Icon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.visitedAt && (
              <span className="text-xs text-foreground/60">
                {new Date(item.visitedAt).toLocaleDateString()}
              </span>
            )}
            {item.discount && (
              <span className="text-xs text-foreground/70">{item.discount}</span>
            )}
          </div>

          {/* Description Collapsible */}
          {item.description && (
            <Collapsible open={isDescOpen} onOpenChange={setIsDescOpen}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-2 rounded-lg bg-foreground/5 hover:bg-foreground/10 transition-colors">
                  <span className="text-xs font-medium text-foreground/70">
                    {isDescOpen ? "Hide" : "Show"} Description
                  </span>
                  <ChevronDownIcon
                    className={`w-3 h-3 text-foreground/70 transition-transform ${
                      isDescOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>

              <AnimatePresence>
                {isDescOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CollapsibleContent className="pt-2">
                      <p className="text-xs leading-relaxed text-foreground/70">
                        {item.description}
                      </p>
                    </CollapsibleContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Collapsible>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default function Cart() {
  const [items, setItems] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Load cart items from storage
  useEffect(() => {
    loadCartItems();
  }, []);

  const loadCartItems = async () => {
    setLoading(true);
    const cartItems = await getCartItems();
    setItems(cartItems);
    setLoading(false);
  };

  // Listen for storage changes to keep cart in sync
  useEffect(() => {
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.shopping_cart) {
        setItems(changes.shopping_cart.newValue || []);
      }
    };

    chrome.storage.local.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.local.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleRemoveItem = async (id: string) => {
    await removeFromCart(id);
    // Items will update via storage listener
  };

  const handleChangeQty = async (id: string, delta: number) => {
    await updateCartQuantity(id, delta);
    // Items will update via storage listener
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col px-4 gap-3"
    >
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <p className="text-sm text-foreground/60">Loading cart...</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground/80">
              Your Cart
            </h2>
            <Separator className="bg-foreground/5" />
          </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CartItem key={item.id} item={item} onRemove={handleRemoveItem} />
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 text-center border border-foreground/10 rounded-2xl bg-card/40"
          >
            <p className="text-sm text-foreground/70">Your cart is empty.</p>
          </motion.div>
        )}
      </div>
        </>
      )}
    </motion.div>
  );
}
