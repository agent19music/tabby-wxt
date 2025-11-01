import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SearchIcon,
  ExternalLinkIcon,
  ClockIcon,
  CopyIcon,
  Trash2Icon,
  SparklesIcon,
  AlertCircleIcon,
} from "lucide-react";
import { getAllSiteVisits, searchSiteVisitsWithAI } from "@/components/functions/db/site_visits_storage";
import type { SiteVisit, SearchResult } from "@/components/functions/db.types";

type HistoryItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  url: string;
  site: string;
  searchedAt: string; // ISO string
  previewImage?: string;
  relevance_score?: number;
  match_reason?: string;
};

const normalize = (s: string) => s.toLocaleLowerCase();

function siteVisitToHistoryItem(visit: SiteVisit, searchResult?: SearchResult): HistoryItem {
  try {
    const urlObj = new URL(visit.url);
    return {
      id: visit.id,
      title: visit.title,
      description: visit.summary || "No description available",
      tags: visit.tags,
      url: visit.url,
      site: visit.domain,
      searchedAt: new Date(visit.timestamp).toISOString(),
      previewImage: visit.image,
      relevance_score: searchResult?.relevance_score,
      match_reason: searchResult?.match_reason,
    };
  } catch {
    return {
      id: visit.id,
      title: visit.title,
      description: visit.summary || "No description available",
      tags: visit.tags,
      url: visit.url,
      site: visit.domain,
      searchedAt: new Date(visit.timestamp).toISOString(),
      previewImage: visit.image,
      relevance_score: searchResult?.relevance_score,
      match_reason: searchResult?.match_reason,
    };
  }
}

export default function SearchHistory() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAISearch, setIsAISearch] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load all site visits on mount
  useEffect(() => {
    const loadVisits = async () => {
      try {
        const visits = await getAllSiteVisits();
        const historyItems = visits
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50) // Show last 50 visits
          .map(visit => siteVisitToHistoryItem(visit));
        setItems(historyItems);
      } catch (error) {
        console.error("Failed to load site visits:", error);
      }
    };
    loadVisits();
  }, []);

  // Handle AI-powered search
  const handleAISearch = async () => {
    if (!query || query.trim().length === 0) return;
    
    setIsSearching(true);
    setIsAISearch(true);
    setHasSearched(true);
    
    try {
      console.log("Searching with AI:", query);
      const searchResults = await searchSiteVisitsWithAI(query);
      
      const historyItems = searchResults.map(result => 
        siteVisitToHistoryItem(result.visit, result)
      );
      
      setItems(historyItems);
    } catch (error) {
      console.error("AI search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Enter key for search
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAISearch();
    }
  };

  // Simple text filter for displayed items
  const filtered = useMemo(() => {
    if (isAISearch) return items; // Don't filter AI results
    
    const q = normalize(query);
    if (!q) return items;
    return items.filter((it) => {
      const text = [
        it.title,
        it.description,
        it.site,
        it.tags.join(" "),
      ].join(" ");
      return normalize(text).includes(q);
    });
  }, [items, query, isAISearch]);

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const getFaviconFromUrl = (url: string) => {
    try {
      const u = new URL(url);
      return `${u.origin}/favicon.ico`;
    } catch {
      return undefined;
    }
  };

  // Separate high vs low confidence results
  const highConfidenceResults = filtered.filter(it => !it.relevance_score || it.relevance_score >= 80);
  const lowConfidenceResults = filtered.filter(it => it.relevance_score && it.relevance_score < 80 && it.relevance_score >= 40);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-3 px-4 py-4"
      >
        {/* Header search */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl font-semibold text-foreground/70">
              Search History
            </h1>
            <Separator className="bg-foreground/5 flex-1" />
          </div>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                className="bg-card/50 border-border/50 border min-h-12 p-2 pl-9 pr-3 w-full rounded-[100px] backdrop-blur-sm focus:border-border transition-all duration-200 shadow-sm outline-none"
                placeholder="Search your history with AI..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (e.target.value === "") {
                    setIsAISearch(false);
                    setHasSearched(false);
                  }
                }}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
              />
            </div>
            <Button
              onClick={handleAISearch}
              disabled={isSearching || !query.trim()}
              className="min-h-12 px-6 rounded-[100px] bg-primary hover:bg-primary/90"
            >
              {isSearching ? (
                <>
                  <span className="animate-spin mr-2">⚡</span>
                  Searching...
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4 mr-2" />
                  AI Search
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* High Confidence Results */}
          {hasSearched && isAISearch && highConfidenceResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  Top Results
                </h3>
                <Separator className="bg-foreground/5 flex-1" />
              </div>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {highConfidenceResults.map((it, index) => (
              <motion.div
                key={it.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.03 }}
                className="p-4 bg-card rounded-2xl border border-border/50 hover:border-border hover:shadow-sm backdrop-blur-sm transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    <div className="w-24 h-16 rounded-xl overflow-hidden border border-foreground/10 bg-foreground/5">
                      {it.previewImage ? (
                        <img
                          src={it.previewImage}
                          alt={it.title || it.site}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full animate-pulse" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {it.title || it.query}
                        </h4>
                        <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                          {it.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-foreground/60">
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            <span>
                              {new Date(it.searchedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <ExternalLinkIcon className="w-3 h-3" />
                            <a
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline truncate"
                              title={it.url}
                            >
                              {it.site}
                            </a>
                          </div>
                        </div>
                        {it.match_reason && (
                          <div className="mt-2 px-2 py-1 rounded-lg bg-muted/50 border border-border/30">
                            <p className="text-xs text-foreground/70">
                              <span className="font-medium">Why: </span>
                              {it.match_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Micro interactions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {it.relevance_score && (
                          <div className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
                            <span className="text-xs font-semibold text-primary">
                              {it.relevance_score}% match
                            </span>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => onCopy(it.url)}
                          title="Copy URL"
                          aria-label="Copy URL"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Low Confidence Results */}
          {hasSearched && isAISearch && lowConfidenceResults.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                  Lower Confidence Matches
                </h3>
                <Separator className="bg-foreground/5 flex-1" />
              </div>
              {lowConfidenceResults.map((it, index) => (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (highConfidenceResults.length + index) * 0.03 }}
                  className="p-4 bg-card/60 rounded-2xl border border-yellow-500/20 hover:border-yellow-500/40 backdrop-blur-sm transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <div className="w-24 h-16 rounded-xl overflow-hidden border border-foreground/10 bg-foreground/5">
                        {it.previewImage ? (
                          <img
                            src={it.previewImage || getFaviconFromUrl(it.url)}
                            alt={it.title || it.site}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full animate-pulse" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground truncate">
                            {it.title}
                          </h4>
                          <p className="text-xs text-foreground/70 mt-1 line-clamp-2">
                            {it.description}
                          </p>
                          {it.match_reason && (
                            <div className="mt-2 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <p className="text-xs text-foreground/70">
                                <span className="font-medium">Why: </span>
                                {it.match_reason}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {it.relevance_score && (
                            <div className="px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-500">
                                {it.relevance_score}% match
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {filtered.length === 0 && !isSearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center border border-foreground/10 rounded-2xl bg-card/40"
            >
              <p className="text-sm text-foreground/70">
                {hasSearched ? "No matching pages found. Try different keywords." : "No quick filter results found. Try the AI search above!"}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
