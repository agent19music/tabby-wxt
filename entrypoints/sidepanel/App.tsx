import { useState, useEffect } from "react";
import ShoppingPanel from "./components/ShoppingPanel";
import SearchPanel from "./components/SearchPanel";
import { storage } from "@wxt-dev/storage";
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
    <div className="min-h-screen bg-background font-manrope">
      {activeFeature === "shopping" && <ShoppingPanel />}
      {activeFeature === "search" && <SearchPanel />}
      {activeFeature === "stats" && (
        <div className="p-4">
          <h1>Stats - Coming Soon</h1>
        </div>
      )}
    </div>
  );
}

export default App;
