import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Globe, TrendingUp, Calendar } from "lucide-react";
import { SearchHistory } from "./SearchHistory";

interface DomainStats {
  domain: string;
  visits: number;
  timeSpent: number; // in minutes
}

interface WeekStats {
  totalVisits: number;
  totalTime: number; // in minutes
  topDomains: DomainStats[];
  dailyVisits: { day: string; visits: number }[];
}

function App() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'search'>('search');
  const [stats, setStats] = useState<WeekStats>({
    totalVisits: 0,
    totalTime: 0,
    topDomains: [],
    dailyVisits: [],
  });

  useEffect(() => {
    // Get browsing history for the past week
    const getWeekStats = async () => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      try {
        const historyItems = await chrome.history.search({
          text: "",
          startTime: weekAgo,
          maxResults: 10000,
        });

        // Process the data
        const domainMap = new Map<string, DomainStats>();
        const dailyMap = new Map<string, number>();
        let totalVisits = 0;

        historyItems.forEach((item: chrome.history.HistoryItem) => {
          if (!item.url) return;

          try {
            const url = new URL(item.url);
            const domain = url.hostname.replace(/^www\./, "");
            
            // Update domain stats
            const existing = domainMap.get(domain) || {
              domain,
              visits: 0,
              timeSpent: 0,
            };
            existing.visits += item.visitCount || 1;
            existing.timeSpent += (item.visitCount || 1) * 2; // Rough estimate
            domainMap.set(domain, existing);

            // Update daily stats
            if (item.lastVisitTime) {
              const date = new Date(item.lastVisitTime).toLocaleDateString("en-US", {
                weekday: "short",
              });
              dailyMap.set(date, (dailyMap.get(date) || 0) + (item.visitCount || 1));
            }

            totalVisits += item.visitCount || 1;
          } catch (e) {
            // Skip invalid URLs
          }
        });

        // Get top 5 domains
        const topDomains = Array.from(domainMap.values())
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 5);

        // Get daily visits (last 7 days)
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const today = new Date().getDay();
        const dailyVisits = days
          .map((day, index) => {
            const dayIndex = (today - 6 + index + 7) % 7;
            return {
              day: days[dayIndex],
              visits: dailyMap.get(days[dayIndex]) || 0,
            };
          });

        const totalTime = Array.from(domainMap.values()).reduce(
          (sum, d) => sum + d.timeSpent,
          0
        );

        setStats({
          totalVisits,
          totalTime,
          topDomains,
          dailyVisits,
        });
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    getWeekStats();
  }, []);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const maxVisits = Math.max(...stats.topDomains.map((d) => d.visits), 1);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Tabby</h1>
          <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            AI-Powered Browsing Assistant
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Search History
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Analytics
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' ? (
          <SearchHistory />
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Total Visits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {stats.totalVisits.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Spent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900">
                    {formatTime(stats.totalTime)}
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Top Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Sites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.topDomains.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No browsing data available
              </p>
            ) : (
              stats.topDomains.map((domain, index) => (
                <div key={domain.domain} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium text-slate-400 w-4">
                        {index + 1}
                      </span>
                      <span className="font-medium text-slate-900 truncate">
                        {domain.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-600 shrink-0">
                      <span className="text-xs">
                        {domain.visits} visits
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTime(domain.timeSpent)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={(domain.visits / maxVisits) * 100}
                    className="h-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  Daily Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.dailyVisits.map((day) => {
                    const maxDailyVisits = Math.max(
                      ...stats.dailyVisits.map((d) => d.visits),
                      1
                    );
                    return (
                      <div key={day.day} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 w-12">
                            {day.day}
                          </span>
                          <span className="text-xs text-slate-500">
                            {day.visits} visits
                          </span>
                        </div>
                        <Progress
                          value={(day.visits / maxDailyVisits) * 100}
                          className="h-1.5"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
