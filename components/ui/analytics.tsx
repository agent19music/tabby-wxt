import { Card } from './card';
import { Progress } from './progress';

interface AnalyticsProps {
  analytics: any;
}

export function Analytics({ analytics }: AnalyticsProps) {
  if (!analytics) {
    return (
      <Card className="p-6">
        <p className="text-sm text-gray-500">Loading analytics...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Weekly Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold">{analytics.totalVisits}</p>
            <p className="text-xs text-gray-500">Total Visits</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.productPageVisits}</p>
            <p className="text-xs text-gray-500">Product Pages</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.uniqueSites}</p>
            <p className="text-xs text-gray-500">Unique Sites</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.totalProductsTracked}</p>
            <p className="text-xs text-gray-500">Products Tracked</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-md font-semibold mb-3">Top Sites</h3>
        <div className="space-y-2">
          {analytics.topSites?.slice(0, 5).map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm">{item.site}</span>
              <div className="flex items-center gap-2">
                <Progress value={(item.visits / analytics.totalVisits) * 100} className="w-20 h-2" />
                <span className="text-xs text-gray-500 w-8 text-right">{item.visits}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-md font-semibold mb-3">Activity by Day</h3>
        <div className="space-y-2">
          {analytics.dayOfWeekPattern?.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm capitalize">{item.day}</span>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(item.visits / Math.max(...analytics.dayOfWeekPattern.map((d: any) => d.visits))) * 100} 
                  className="w-20 h-2" 
                />
                <span className="text-xs text-gray-500 w-8 text-right">{item.visits}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-md font-semibold mb-3">Top Categories</h3>
        <div className="flex flex-wrap gap-2">
          {analytics.topCategories?.slice(0, 8).map((item: any, i: number) => (
            <span 
              key={i} 
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              {item.category} ({item.products})
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-md font-semibold mb-3">Top Tags</h3>
        <div className="flex flex-wrap gap-2">
          {analytics.topTags?.slice(0, 12).map((item: any, i: number) => (
            <span 
              key={i} 
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
            >
              {item.tag} <span className="text-gray-500">({item.count})</span>
            </span>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-md font-semibold mb-3">Most Viewed Products</h3>
        <div className="space-y-3">
          {analytics.mostViewedProducts?.slice(0, 5).map((product: any, i: number) => (
            <div key={i} className="border-b pb-2">
              <p className="text-sm font-medium">{product.title}</p>
              <div className="flex gap-2 mt-1">
                {product.category?.map((cat: string, j: number) => (
                  <span key={j} className="text-xs text-gray-500">
                    {j > 0 && ' › '}{cat}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {product.viewCount} views • {product.siteCount} sites
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
