import { useState, useEffect } from "react";
import ShoppingPanel from "./components/ShoppingPanel";
import SearchPanel from "./components/SearchPanel";
import { storage } from "@wxt-dev/storage";
import { EnhancedBrowsingStats } from "./components/EnhancedBrowsingStats";
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

  return (
    <div className="min-h-screen bg-background font-roboto antialiased">
      {activeFeature === "shopping" && <ShoppingPanel />}
      {activeFeature === "search" && <SearchPanel />}
      {activeFeature === "stats" && (
        <div className="p-4">
          <EnhancedBrowsingStats />
        </div>
      )}
    </div>
  );
}

export default App;
