"use client";

import { useEffect, useState } from "react";
import { LabelList, Pie, PieChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { analyzeWeeklyHistory, type HistoryAnalysis } from "@/components/functions/history_analyzer";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Clock, TrendingUp, Globe, Zap, Award } from "lucide-react";
import { ClockIcon } from "@phosphor-icons/react";
import { Separator } from "@/components/ui/separator";

function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${period}`;
}

export function BrowsingHistoryChart() {
  const [data, setData] = useState<HistoryAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistoryData();
  }, []);

  async function loadHistoryData() {
    try {
      setIsLoading(true);
      setError(null);
      const analysis = await analyzeWeeklyHistory();
      setData(analysis);
    } catch (err) {
      console.error("Failed to load history data:", err);
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Browsing Activity</CardTitle>
          <CardDescription>Past 7 Days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[350px]">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Browsing Activity</CardTitle>
          <CardDescription>Past 7 Days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[350px]">
            <p className="text-sm text-destructive">{error || "No data available"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { categoryStats, topVisitedSites, totalTimeSpent, totalVisits, peakHour, mostProductiveCategory } = data;

  if (categoryStats.length === 0) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle>Browsing Activity</CardTitle>
          <CardDescription>Past 7 Days</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <div className="flex items-center justify-center min-h-[350px]">
            <p className="text-sm text-muted-foreground">No browsing history found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build dynamic chart config
  const chartConfig: ChartConfig = {
    timeSpent: {
      label: "Time Spent",
    },
    ...Object.fromEntries(
      categoryStats.map((stat) => [
        stat.category,
        {
          label: stat.label,
          color: stat.fill,
        },
      ])
    ),
  };

  // Transform data for recharts
  const chartDataFormatted = categoryStats.map((stat) => ({
    category: stat.label,
    timeSpent: stat.timeSpent,
    fill: stat.fill,
  }));

  // Calculate productivity vs entertainment ratio
  const productiveCategories = ["Development", "Productivity", "Education", "Documentation", "Research"];
  const entertainmentCategories = ["Video", "Streaming", "Social Media", "Gaming", "Music"];
  
  const productiveTime = categoryStats
    .filter(s => productiveCategories.includes(s.label))
    .reduce((sum, s) => sum + s.timeSpent, 0);
  
  const entertainmentTime = categoryStats
    .filter(s => entertainmentCategories.includes(s.label))
    .reduce((sum, s) => sum + s.timeSpent, 0);

  const productivityRatio = totalTimeSpent > 0 ? (productiveTime / totalTimeSpent) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center gap-2">
          Time Spent by Category
          <Badge variant="outline" className="text-muted-foreground border-border">
            {formatTime(totalTimeSpent)}
          </Badge>
        </CardTitle>
        <CardDescription>Past 7 Days • {totalVisits.toLocaleString()} total visits</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[350px]"
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent 
                  labelKey="category"
                  formatter={(value) => formatTime(value as number)}
                />
              }
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
      </CardContent>

      <CardFooter className="flex-col gap-4 text-sm pt-6">
        {/* Key Insights */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Peak Hour</div>
              <div className="font-semibold">{formatHour(peakHour)}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Productivity</div>
              <div className="font-semibold">{productivityRatio.toFixed(0)}%</div>
            </div>
          </div>
          
          {mostProductiveCategory !== "None" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 col-span-2">
              <Award className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Top Productive Category</div>
                <div className="font-semibold">{mostProductiveCategory}</div>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Category Breakdown - Top 3 Domains by Time */}
        <div className="w-full space-y-3">
          <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
            Time Distribution
          </div>
          {categoryStats.slice(0, 4).map((stat) => (
            <div key={stat.category} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: stat.fill }}
                  />
                  <span className="font-medium text-sm">{stat.label}</span>
                </div>
                <span className="text-muted-foreground text-sm shrink-0">
                  {formatTime(stat.timeSpent)}
                </span>
              </div>
              <div className="pl-5 text-xs text-muted-foreground">
                {stat.topDomains.map((d, i) => (
                  <div key={d.domain} className="flex justify-between items-center py-0.5">
                    <span className="truncate">
                      {i + 1}. {d.domain}
                    </span>
                    <span className="shrink-0 ml-2">{formatTime(d.timeSpent)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Top Visited Sites */}
        <div className="w-full space-y-2">
          <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Most Visited Sites
          </div>
          {topVisitedSites.map((site, index) => (
            <div key={site.domain} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center shrink-0">
                  {index + 1}
                </Badge>
                <Globe className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{site.domain}</span>
              </div>
              <div className="text-muted-foreground shrink-0 text-xs">
                {site.visitCount} visits • {formatTime(site.timeSpent)}
              </div>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
