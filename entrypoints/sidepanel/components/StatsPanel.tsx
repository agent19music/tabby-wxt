import { BrowsingHistoryChart } from "./BrowsingHistoryChart";

export default function StatsPanel() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Weekly Stats</h1>
        <p className="text-sm text-muted-foreground">
          Your browsing habits and insights
        </p>
      </div>
      
      <BrowsingHistoryChart />
    </div>
  );
}
