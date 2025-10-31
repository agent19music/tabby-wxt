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
} from "lucide-react";
import { SidebarHeaderMain } from "../shared/header";

type HistoryItem = {
  id: string;
  query: string;
  title: string;
  description: string;
  mediaDescription?: string;
  tags: string[];
  url: string;
  site: string;
  searchedAt: string; // ISO string
  previewImage?: string;
};

const mockHistory: HistoryItem[] = [
  {
    id: "h1",
    query: "learn about our services and projects in kenya",
    title: "Glitex Solutions — Software Development Company in Nairobi Kenya",
    description:
      "We turn ideas into powerful apps, platforms, and AI solutions used by millions.",
    mediaDescription:
      "Hero with bold headline about quality, security, and scalability.",
    tags: ["software", "ai", "mvp", "kenya"],
    url: "https://www.glitexsolutions.co.ke",
    site: "glitexsolutions.co.ke",
    searchedAt: "2025-01-24T10:12:00Z",
  },
  {
    id: "h2",
    query: "shadcn ui components documentation and examples",
    title: "shadcn/ui — The Foundation for your Design System",
    description:
      "Beautifully designed components you can customize, extend, and build on.",
    mediaDescription:
      "Docs landing with components, blocks, charts, and themes.",
    tags: ["ui", "components", "react"],
    url: "https://ui.shadcn.com",
    site: "ui.shadcn.com",
    searchedAt: "2025-01-23T18:45:00Z",
  },
  {
    id: "h3",
    query: "english articles and projects by rightson",
    title: "Rightson — Projects and Articles",
    description: "Personal site with English content on software and design.",
    mediaDescription: "Clean landing with links to articles and projects.",
    tags: ["blog", "portfolio", "engineering"],
    url: "https://www.rightson.xyz",
    site: "rightson.xyz",
    searchedAt: "2025-01-22T08:05:00Z",
  },
];

const normalize = (s: string) => s.toLocaleLowerCase();

export default function SearchHistory() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<HistoryItem[]>(mockHistory);
  const [loadingPreviewIds, setLoadingPreviewIds] = useState<Set<string>>(
    new Set()
  );

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return items;
    return items.filter((it) => {
      const text = [
        it.query,
        it.title,
        it.description,
        it.site,
        it.tags.join(" "),
      ].join(" ");
      return normalize(text).includes(q);
    });
  }, [items, query]);

  const onRemove = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

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

  // Mock link-preview-js integration: prefer site meta image (if present), else favicon
  useEffect(() => {
    const run = async () => {
      const missing = items.filter((i) => !i.previewImage);
      if (!missing.length) return;
      setLoadingPreviewIds(new Set(missing.map((m) => m.id)));
      const updated = items.map((i) =>
        i.previewImage ? i : { ...i, previewImage: getFaviconFromUrl(i.url) }
      );
      setItems(updated);
      setLoadingPreviewIds(new Set());
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <SidebarHeaderMain />
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
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              className="bg-card/50 border-border/50 border min-h-12 p-2 pl-9 w-full rounded-[100px] backdrop-blur-sm focus:border-border transition-all duration-200 shadow-sm outline-none"
              placeholder="Search your history in any language..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((it, index) => (
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
                      </div>

                      {/* Micro interactions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-lg"
                          onClick={() => onCopy(it.query)}
                          title="Copy query"
                          aria-label="Copy query"
                        >
                          <CopyIcon className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10"
                          onClick={() => onRemove(it.id)}
                          title="Remove"
                          aria-label="Remove"
                        >
                          <Trash2Icon className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 text-center border border-foreground/10 rounded-2xl bg-card/40"
            >
              <p className="text-sm text-foreground/70">No results found.</p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
