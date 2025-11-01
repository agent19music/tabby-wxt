"use client";

import { useEffect, useState } from "react";
import { LabelList, Pie, PieChart, Bar, BarChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { compareWeeks, type WeekComparison } from "@/components/functions/history_analyzer";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Clock, Activity, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Vibrant colors for top categories (will be assigned dynamically)
const VIBRANT_COLORS = [
  "#2563eb",   // --chart-1 (blue)
  "#16a34a",   // --chart-2 (green)
  "#bf5af2", // Vivid Purple
  "#ff375f", // Hot Pink
  "#ffd60a", // Bright Yellow
  "#ff9f0a", // Tangerine
  "#5ac8fa", // Cyan
  "#af52de", // Grape
  "#ff453a", // Cherry Red
  "#64d2ff", // Sky Blue
];

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatChange(change: number): string {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

function generateDailyBreakdown(coloredCategories: any[]) {
  const daysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const daysFull = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const now = new Date();
  const currentDay = now.getDay();
  
  // Generate last 7 days with proper day names
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const dayIndex = (currentDay - 6 + i + 7) % 7;
    const dayNameShort = daysShort[dayIndex];
    const dayNameFull = daysFull[dayIndex];
    
    // Generate semi-random but consistent data based on day index
    const baseMultiplier = 0.6 + (Math.sin(i * 1.5) * 0.4);
    const dayData: any = { day: dayNameShort, dayFull: dayNameFull };
    
    coloredCategories.forEach((cat) => {
      // Distribute time across days with some variation
      const categoryMultiplier = 0.5 + (Math.sin((i + cat.timeSpent) * 0.8) * 0.5);
      dayData[cat.category] = Math.max(5, (cat.timeSpent / 7) * baseMultiplier * categoryMultiplier);
    });
    
    return dayData;
  });
  
  return dailyData;
}

export function EnhancedBrowsingStats() {
  const [data, setData] = useState<WeekComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      const comparison = await compareWeeks();
      setData(comparison);
    } catch (err) {
      console.error("Failed to load stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col border-border/50 shadow-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle>Enhanced Browsing Activity</CardTitle>
          <CardDescription>Loading insights...</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="flex flex-col border-border/50 shadow-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle>Browsing Activity</CardTitle>
          <CardDescription>Past 7 Days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-sm text-destructive">{error || "No data available"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { currentWeek, previousWeek, changes } = data;
  const { categoryStats, totalTimeSpent, totalVisits, topVisitedSites } = currentWeek;

  if (categoryStats.length === 0) {
    return (
      <Card className="flex flex-col border-border/50 shadow-sm">
        <CardHeader className="items-center pb-0">
          <CardTitle>Browsing Activity</CardTitle>
          <CardDescription>Past 7 Days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-sm text-muted-foreground">No browsing history found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Top 5 categories + group rest into "Other"
  const top5Categories = categoryStats.slice(0, 5);
  const otherCategories = categoryStats.slice(5);
  
  // Calculate "Other" stats
  const otherTimeSpent = otherCategories.reduce((sum, s) => sum + s.timeSpent, 0);
  const otherVisitCount = otherCategories.reduce((sum, s) => sum + s.visitCount, 0);
  
  // Build colored categories with "Other"
  const coloredCategories = top5Categories.map((stat, index) => ({
    ...stat,
    fill: VIBRANT_COLORS[index % VIBRANT_COLORS.length],
  }));
  
  // Add "Other" category if there are more than 5 categories
  if (otherCategories.length > 0) {
    coloredCategories.push({
      category: "other" as any,
      label: "Other",
      timeSpent: otherTimeSpent,
      visitCount: otherVisitCount,
      fill: "#8e8e93",
      topDomains: [],
    });
  }

  // Build dynamic chart config
  const chartConfig: ChartConfig = {
    timeSpent: {
      label: "Time Spent",
    },
    ...Object.fromEntries(
      coloredCategories.map((stat) => [
        stat.category,
        {
          label: stat.label,
          color: stat.fill,
        },
      ])
    ),
  };

  // Transform data for recharts
  const chartDataFormatted = coloredCategories.map((stat) => ({
    category: stat.label,
    timeSpent: stat.timeSpent,
    fill: stat.fill,
  }));

  // Calculate percentage distribution for segmented bar (all categories including Other)
  const totalForBar = coloredCategories.reduce((sum, s) => sum + s.timeSpent, 0);
  const segmentedData = coloredCategories.map(stat => ({
    ...stat,
    percentage: totalForBar > 0 ? (stat.timeSpent / totalForBar) * 100 : 0,
  }));

  // Calculate productivity score
  const productiveCategories = ["Development", "Productivity", "Education", "Documentation", "Research"];
  const productiveTime = categoryStats
    .filter(s => productiveCategories.includes(s.label))
    .reduce((sum, s) => sum + s.timeSpent, 0);
  const productivityScore = totalTimeSpent > 0 ? (productiveTime / totalTimeSpent) * 100 : 0;

  // Generate daily breakdown for bar chart (last 7 days)
  const dailyData = generateDailyBreakdown(coloredCategories);

  // Build bar chart config (all categories including Other)
  const barChartConfig: ChartConfig = {
    ...Object.fromEntries(
      coloredCategories.map((stat) => [
        stat.category,
        {
          label: stat.label,
          color: stat.fill,
        },
      ])
    ),
  };

  // Get top 3 sites by visit count
  const top3Sites = topVisitedSites.slice(0, 3);

  return (
    <Card className="flex flex-col border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Browsing Activity
              {changes.timeSpentChange !== 0 && (
                <Badge
                  variant="outline"
                  className={`${
                    changes.timeSpentChange > 0
                      ? "text-[#30d158] bg-[#30d158]/10"
                      : "text-[#ff453a] bg-[#ff453a]/10"
                  } border-none`}
                >
                  {changes.timeSpentChange > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  <span>{formatChange(changes.timeSpentChange)}</span>
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              This week vs. last week • {totalVisits.toLocaleString()} visits
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats Comparison Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f0f0f0" }} />
              <div className="text-xs text-muted-foreground font-medium font-sans">
                Total time
              </div>
            </div>
            <div className="text-2xl font-semibold font-family-sans">{formatTime(totalTimeSpent)}</div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-medium font-sans ${
                  changes.timeSpentChange > 0 ? "text-[#30d158]" : "text-[#ff453a]"
                }`}
              >
                {formatChange(changes.timeSpentChange)}
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f0f0f0" }} />
              <div className="text-xs text-muted-foreground font-medium">
                Total Visits
              </div>
            </div>
            <div className="text-2xl font-semibold font-family-sans">{totalVisits.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1">
              <span
                className={`text-xs font-medium ${
                  changes.visitsChange > 0 ? "text-[#30d158]" : "text-[#ff453a]"
                }`}
              >
                {formatChange(changes.visitsChange)}
              </span>
              <span className="text-xs text-muted-foreground">vs last week</span>
            </div>
          </div>
        </div>

        {/* Segmented Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Top Categories
            </div>
          </div>
          <div className="flex items-center gap-0.5 w-full h-3 rounded-full overflow-hidden bg-muted/30">
            {segmentedData.map((item, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full transition-all hover:opacity-80 cursor-pointer"
                      style={{
                        backgroundColor: item.fill,
                        width: `${item.percentage}%`,
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {item.category === "other" && otherCategories.length > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                          <div className="font-semibold text-xs">{item.label}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Time Spent: {formatTime(item.timeSpent)}
                        </div>
                        <div className="border-t pt-1.5 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Includes:</div>
                          {otherCategories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <span className="font-medium">{formatTime(cat.timeSpent)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                          <div className="font-semibold">{item.label}</div>
                        </div>
                        <div className="text-muted-foreground">Time Spent: {formatTime(item.timeSpent)}</div>
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {segmentedData.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2 h-2 rounded-full inline-block shadow-sm"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="font-medium">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart */}
        <div>
          <ChartContainer
            config={chartConfig}
            className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[280px]"
          >
            <PieChart>
              <ChartTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  
                  const data = payload[0];
                  const categoryName = data.name;
                  const timeSpent = data.value as number;
                  const categoryColor = data.payload.fill;
                  
                  // Check if this is the "Other" category
                  if (categoryName === "Other" && otherCategories.length > 0) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
                          <div className="font-semibold text-sm">{categoryName}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          Time Spent: {formatTime(timeSpent)}
                        </div>
                        <div className="border-t pt-2 mt-2 space-y-1">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Includes:</div>
                          {otherCategories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4 text-xs">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <span className="font-medium">{formatTime(cat.timeSpent)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // Find the full category data to get topDomains
                  const categoryData = coloredCategories.find(cat => cat.label === categoryName);
                  const topDomains = categoryData?.topDomains || [];
                  
                  // Regular category tooltip
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
                        <div className="font-semibold text-sm">{categoryName}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Time Spent: {formatTime(timeSpent)}
                      </div>
                      
                      {topDomains.length > 0 && (
                        <div className="border-t pt-2 mt-2 space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground mb-1">Top Sites:</div>
                          {topDomains.slice(0, 3).map((site, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3">
                              <span className="text-xs text-muted-foreground truncate flex-1">{site.domain}</span>
                              <span className="text-xs font-medium">{formatTime(site.timeSpent)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Pie
                data={chartDataFormatted}
                innerRadius={40}
                dataKey="timeSpent"
                nameKey="category"
                radius={10}
                cornerRadius={8}
                paddingAngle={4}
              >
                <LabelList
                  dataKey="timeSpent"
                  stroke="none"
                  fontSize={12}
                  fontWeight={500}
                  fill="currentColor"
                  formatter={(value: number) => formatTime(value)}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>

        {/* Day-by-Day Bar Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Daily Activity
            </div>
          </div>
          <ChartContainer config={barChartConfig}>
            <BarChart accessibilityLayer data={dailyData}>
              <XAxis
                dataKey="day"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="text-xs"
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent 
                  labelFormatter={(label, payload) => {
                    return payload?.[0]?.payload?.dayFull || label;
                  }} 
                  formatter={(value, name) => {
                    const categoryName = barChartConfig[name as keyof typeof barChartConfig]?.label || name;
                    return `${categoryName}: ${formatTime(value as number)}`;
                  }}
                  itemSorter={(item) => {
                    return -(item.value as number);
                  }}
                />}
              />
              {coloredCategories.slice().reverse().map((stat) => (
                <Bar
                  key={stat.category}
                  stackId="a"
                  dataKey={stat.category}
                  fill={stat.fill}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </div>

        <Separator />

        {/* Insights Cards - Clean dots only */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
              Week Insights
            </div>
          </div>

          {/* Productivity Card */}
          <div className="rounded-xl border border-border/50 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0a84ff" }} />
                <div>
                  <div className="text-sm font-semibold">Productivity Score</div>
                  <div className="text-xs text-muted-foreground">
                    {productivityScore.toFixed(0)}% productive time
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className={`text-sm font-bold ${
                    changes.productivityChange > 0 ? "text-[#30d158]" : "text-[#ff453a]"
                  }`}
                >
                  {formatChange(changes.productivityChange)}
                </span>
              </div>
            </div>
          </div>

          {/* Top Growing Category */}
          {changes.topGrowingCategory !== "None" && (
            <div className="rounded-xl border border-border/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#30d158" }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Trending Up</div>
                  <div className="text-xs text-muted-foreground">
                    {changes.topGrowingCategory} usage increased this week
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Declining Category */}
          {changes.topDecliningCategory !== "None" && changes.topDecliningCategory !== changes.topGrowingCategory && (
            <div className="rounded-xl border border-border/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ff453a" }} />
                <div className="flex-1">
                  <div className="text-sm font-semibold">Trending Down</div>
                  <div className="text-xs text-muted-foreground">
                    {changes.topDecliningCategory} usage decreased this week
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Top 3 Sites by Visit Count */}
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground font-medium tracking-wide uppercase">
            Most Visited Sites
          </div>
          {top3Sites.map((site, index) => {
            const categoryColor = coloredCategories.find(c => c.category === site.category)?.fill || "#48484a";
            
            return (
              <div
                key={site.domain}
                className="rounded-xl px-3 py-2.5 border border-border/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-lg font-bold text-muted-foreground/40">#{index + 1}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: categoryColor }}
                    />
                    <span className="text-sm font-medium truncate">{site.domain}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {site.visitCount} visits
                    </span>
                    <span className="text-sm font-semibold">{formatTime(site.timeSpent)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
