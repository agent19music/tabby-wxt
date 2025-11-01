import { Button } from "@/components/ui/button";
import { Settings, X } from "lucide-react";
import React from "react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CurrentProduct from "../CurrentProduct";
import PastProducts from "./past_products/PastProducts";
import { GearSixIcon, XIcon } from "@phosphor-icons/react";
import logo from "@/assets/logo.png";
import { Separator } from "@/components/ui/separator";
import Cart from "./cart/Cart";
type Props = {};


export const ShoppingTabs = () => {
  const tabs = [
    {
      label: "Current Product",
      value: "currentproduct",
    },

    {
      label: "Cart",
      value: "cart",
    },
    {
      label: "Viewed Products",
      value: "viewedproducts",
    },
  ];
  return (
    <Tabs defaultValue={tabs[0].value} className="w-full h-full flex flex-col">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-semibold text-foreground/70">Shopping</h1>
          <Separator className="bg-foreground/5 flex-1" />
        </div>
        <TabsList className="w-full border border-foreground/5 bg-card h-auto rounded-full backdrop-blur-3xl p-1 ">
          {tabs.map((tab, index) => (
            <TabsTrigger
              key={index}
              value={tab.value}
              className="flex-1 shadow-none py-2 text-sm font-medium text-muted-foreground rounded-full 
            data-[state=active]:bg-foreground/5 
            "
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={tabs[0].value} className="flex-1 flex flex-col">
        <CurrentProduct />
      </TabsContent>

      <TabsContent value={tabs[1].value} className="flex-1 flex flex-col">
        <Cart />
      </TabsContent>
      <TabsContent value={tabs[2].value} className="flex-1 flex flex-col">
        <PastProducts />
      </TabsContent>
    </Tabs>
  );
};
