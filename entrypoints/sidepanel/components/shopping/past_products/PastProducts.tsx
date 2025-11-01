
import React from "react";
import { PastProductsMain } from "./past_products_components";
import YoutubeProducts from "./youtube_products";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function PastProducts() {
  const tabs = [
    { label: "Ecommerce Products", value: "websites" },
    { label: "YouTube Products", value: "youtube" },
  ];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-base font-semibold text-foreground/70">
            Viewed Products
          </h2>
          <Separator className="bg-foreground/5 flex-1" />
        </div>
      </div>
      <Tabs
        defaultValue={tabs[0].value}
        className="w-full h-full flex flex-col"
      >
        <div className="px-4">
          <TabsList className="w-full border border-border/50 bg-card h-auto rounded-full backdrop-blur-sm p-1 shadow-sm">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 shadow-none py-2 text-sm font-medium text-muted-foreground rounded-full data-[state=active]:bg-foreground/8 transition-all duration-200"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="websites" className="flex-1 flex flex-col">
          <PastProductsMain />
        </TabsContent>
        <TabsContent value="youtube" className="flex-1 flex flex-col">
          <YoutubeProducts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
