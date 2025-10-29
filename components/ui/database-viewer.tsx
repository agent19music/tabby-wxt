import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function DatabaseViewer() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'products' | 'visits' | 'analytics'>('analytics');

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' });
      if (response.success) {
        setData(response.analytics);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <p className="text-sm text-gray-500">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 mb-4">
        <Button 
          size="sm" 
          variant={view === 'analytics' ? 'default' : 'outline'}
          onClick={() => setView('analytics')}
        >
          Analytics
        </Button>
        <Button 
          size="sm" 
          variant={view === 'products' ? 'default' : 'outline'}
          onClick={() => setView('products')}
        >
          Products
        </Button>
        <Button 
          size="sm" 
          variant={view === 'visits' ? 'default' : 'outline'}
          onClick={() => setView('visits')}
        >
          Visits
        </Button>
        <Button size="sm" variant="outline" onClick={loadData}>
          Refresh
        </Button>
      </div>

      {view === 'analytics' && data && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Overview</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Visits: <strong>{data.totalVisits}</strong></div>
              <div>Product Pages: <strong>{data.productPageVisits}</strong></div>
              <div>Unique Sites: <strong>{data.uniqueSites}</strong></div>
              <div>Products: <strong>{data.totalProductsTracked}</strong></div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Top Sites</h3>
            <div className="space-y-1 text-sm">
              {data.topSites?.slice(0, 5).map((s: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span>{s.site}</span>
                  <span className="text-gray-500">{s.visits}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-2">Top Tags</h3>
            <div className="flex flex-wrap gap-1">
              {data.topTags?.slice(0, 10).map((t: any, i: number) => (
                <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                  {t.tag} ({t.count})
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}

      {view === 'products' && data && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Most Viewed Products</h3>
          <div className="space-y-2 text-sm">
            {data.mostViewedProducts?.map((p: any, i: number) => (
              <div key={i} className="border-b pb-2">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-gray-500">
                  {p.category?.join(' › ')} • {p.viewCount} views • {p.siteCount} sites
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === 'visits' && data && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Activity by Day</h3>
          <div className="space-y-1 text-sm">
            {data.dayOfWeekPattern?.map((d: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span className="capitalize">{d.day}</span>
                <span className="text-gray-500">{d.visits}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
