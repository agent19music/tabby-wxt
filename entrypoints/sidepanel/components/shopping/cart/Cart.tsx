import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Trash2Icon,
  PlusIcon,
  MinusIcon,
  ExternalLinkIcon,
} from "lucide-react";
import soundcore from "@/assets/soundcore.png";

type CartProduct = {
  id: string;
  name: string;
  image: string;
  url: string;
  price: number; // numeric for calculations
  variant?: string;
};

type CartItem = CartProduct & { quantity: number };

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amount);

const initialItems: CartItem[] = [
  {
    id: "1",
    name: "Sony WH-1000XM5",
    image: soundcore,
    url: "https://www.sony.com/headphones/wh-1000xm5",
    price: 399.99,
    quantity: 1,
    variant: "Black",
  },
  {
    id: "2",
    name: "Bose QuietComfort 45",
    image: soundcore,
    url: "https://www.bose.com/quietcomfort-45",
    price: 329.0,
    quantity: 2,
    variant: "White",
  },
];

export default function Cart() {
  const [items, setItems] = useState<CartItem[]>(initialItems);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const total = useMemo(() => subtotal, [subtotal]);

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const changeQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex-1 flex flex-col px-4 gap-3"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground/80">Your Cart</h2>
        <Separator className="bg-foreground/5" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="p-4 bg-gradient-to-r from-card/60 to-card/40 rounded-2xl border border-foreground/10 hover:border-primary/20 hover:shadow-md backdrop-blur-sm transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border border-foreground/10"
                  />
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">
                        {item.name}
                      </h4>
                      {item.variant ? (
                        <p className="text-xs text-foreground/60 mt-1">
                          {item.variant}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove"
                        title="Remove"
                      >
                        <Trash2Icon className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={() => changeQty(item.id, -1)}
                        aria-label="Decrease quantity"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </Button>
                      <span className="min-w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={() => changeQty(item.id, 1)}
                        aria-label="Increase quantity"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={() => window.open(item.url, "_blank")}
                        aria-label="View product"
                        title="Open in new tab"
                      >
                        <ExternalLinkIcon className="w-4 h-4 text-primary" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
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

      <div className="mt-auto space-y-3">
        <div className="p-4 rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm text-foreground/70">
            <span>Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <Separator className="my-3 bg-foreground/5" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-bold">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Checkout action removed for extension storage-only cart */}
      </div>
    </motion.div>
  );
}
