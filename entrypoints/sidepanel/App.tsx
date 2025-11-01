import { useState, useEffect } from "react";
import ShoppingPanel from "./components/ShoppingPanel";
import SearchPanel from "./components/SearchPanel";
import { storage } from "@wxt-dev/storage";
import { EnhancedBrowsingStats } from "./components/EnhancedBrowsingStats";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
type Feature = "shopping" | "search" | "stats";

function App() {
  const [activeFeature, setActiveFeature] = useState<Feature>("shopping");

  useEffect(() => {
    // Get initial feature from WXT storage
    const getInitialFeature = async () => {
      const feature = await storage.getItem("local:activeFeature");
      if (feature) {
        setActiveFeature(feature as Feature);
      }
    };
    getInitialFeature();

    // Listen for storage changes using WXT
    const unwatch = storage.watch("local:activeFeature", (newValue) => {
      if (newValue) {
        setActiveFeature(newValue as Feature);
      }
    });

    return unwatch;
  }, []);

  const handleFeatureChange = async (value: string) => {
    const feature = value as Feature;
    setActiveFeature(feature);
    await storage.setItem("local:activeFeature", feature);
  };

  return (
    <div className="min-h-screen bg-background font-roboto antialiased">
      <Tabs value={activeFeature} onValueChange={handleFeatureChange} className="w-full h-full flex flex-col">
        <div className="px-4 pt-4">
          <TabsList className="w-full border border-border/50 bg-card h-auto rounded-full backdrop-blur-sm p-1 shadow-sm">
            <TabsTrigger
              value="shopping"
              className="flex-1 shadow-none py-2 text-sm font-medium text-muted-foreground rounded-full data-[state=active]:bg-foreground/8 transition-all duration-200"
            >
              Smart Shopping
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="flex-1 shadow-none py-2 text-sm font-medium text-muted-foreground rounded-full data-[state=active]:bg-foreground/8 transition-all duration-200"
            >
              Search History
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex-1 shadow-none py-2 text-sm font-medium text-muted-foreground rounded-full data-[state=active]:bg-foreground/8 transition-all duration-200"
            >
              Browsing Stats
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="shopping" className="flex-1 mt-0">
          <ShoppingPanel />
        </TabsContent>
        <TabsContent value="search" className="flex-1 mt-0">
          <SearchPanel />
        </TabsContent>
        <TabsContent value="stats" className="flex-1 mt-0">
          <div className="p-4">
            <EnhancedBrowsingStats />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
