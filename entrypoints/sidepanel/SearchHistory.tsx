import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface SiteVisit {
  id?: number;
  url: string;
  site: string;
  title: string;
  tags: string[];
  searchableDescription?: string;
  timestamp: number;
  isProductPage: boolean;
}

export function SearchHistory() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteVisit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SEARCH_HISTORY',
        data: {
          query: query.trim(),
          limit: 20
        }
      });
      
      if (response.success) {
        setResults(response.results || []);
      } else {
        setError(response.error || 'Search failed');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Your History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 'blue theme saas dashboard' or 'design inspiration'"
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? 'Searching...' : 'Search'}
            </Button>
          </div>
          
          {error && (
            <div className="mt-2 text-red-500 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((visit, index) => (
            <Card key={visit.id || index} className="hover:bg-gray-50 cursor-pointer">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-sm">
                    {visit.title}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {formatDate(visit.timestamp)}
                  </span>
                </div>
                
                {visit.searchableDescription && (
                  <p className="text-sm text-gray-700 mb-2">
                    {visit.searchableDescription}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {visit.tags.slice(0, 5).map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <a
                  href={visit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {visit.site}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {results.length === 0 && !isSearching && query && (
        <Card>
          <CardContent className="pt-4 text-center text-gray-500">
            No results found. Try a different search query.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
