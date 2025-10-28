import { Button } from "@/components/ui/button";
import { BarChart3, ShoppingBag, Brain } from "lucide-react";
import { storage } from "@wxt-dev/storage";

function App() {
  const openSidePanel = async (feature: string) => {
    try {
      // Store the selected feature using WXT storage
      await storage.setItem("local:activeFeature", feature);
      console.log("Feature stored using WXT storage");

      // Check if chrome.sidePanel is available
      if (!chrome?.sidePanel?.open) {
        throw new Error(
          "Chrome sidePanel API is not available. Make sure you are using Chrome 114+"
        );
      }

      // Get current window and open side panel
      const window = await chrome.windows.getCurrent();
      console.log("Current window:", window);
      //@ts-ignore
      await chrome.sidePanel.open({ windowId: window.id });
      console.log("Side panel opened successfully");
    } catch (error) {
      console.error("Error opening side panel:", error);
      alert("Error opening side panel: " + error);
    }
  };

  return (
    <div className="w-60 p-3 space-y-2 bg-background rounded-md shadow-md font-manrope">
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold text-foreground mb-1">🐱 Tabby</h1>
        <p className="text-xs text-muted-foreground">Smart Browser Assistant</p>
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => openSidePanel("shopping")}
          className="w-full h-8 flex items-center gap-2 text-left justify-start text-sm"
          variant="outline"
        >
          <ShoppingBag className="w-4 h-4" />
          <div>
            <div className="font-medium text-xs">Smart Shopping</div>
          </div>
        </Button>

        <Button
          onClick={() => openSidePanel("search")}
          className="w-full h-8 flex items-center gap-2 text-left justify-start text-sm"
          variant="outline"
        >
          <Brain className="w-4 h-4" />
          <div>
            <div className="font-medium text-xs">AI Search History</div>
          </div>
        </Button>

        <Button
          onClick={() => openSidePanel("stats")}
          className="w-full h-8 flex items-center gap-2 text-left justify-start text-sm"
          variant="outline"
        >
          <BarChart3 className="w-4 h-4" />
          <div>
            <div className="font-medium text-xs">Weekly Stats</div>
          </div>
        </Button>
      </div>

      <div className="text-center pt-2 border-t">
        <p className="text-xs text-muted-foreground">Making browsing smarter</p>
      </div>
    </div>
  );
}

export default App;
