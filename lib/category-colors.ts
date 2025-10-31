import { SiteCategory } from "@/components/types/enums";

export const categoryColors: Record<SiteCategory, string> = {
  [SiteCategory.NEWS]: "#0a84ff",
  [SiteCategory.BLOG]: "#5e5ce6",
  [SiteCategory.SOCIAL_MEDIA]: "#bf5af2",
  [SiteCategory.VIDEO]: "#ff375f",
  [SiteCategory.MUSIC]: "#ff9f0a",
  [SiteCategory.PODCAST]: "#ac8e68",
  [SiteCategory.ECOMMERCE]: "#30d158",
  [SiteCategory.MARKETPLACE]: "#32d74b",
  [SiteCategory.PRODUCTIVITY]: "#64d2ff",
  [SiteCategory.DEVELOPMENT]: "#5ac8fa",
  [SiteCategory.DESIGN]: "#af52de",
  [SiteCategory.BUSINESS]: "#ffd60a",
  [SiteCategory.EDUCATION]: "#0a84ff",
  [SiteCategory.DOCUMENTATION]: "#30d158",
  [SiteCategory.RESEARCH]: "#5e5ce6",
  [SiteCategory.WIKI]: "#64d2ff",
  [SiteCategory.GAMING]: "#ff453a",
  [SiteCategory.STREAMING]: "#ff375f",
  [SiteCategory.SPORTS]: "#ff9f0a",
  [SiteCategory.EMAIL]: "#0a84ff",
  [SiteCategory.MESSAGING]: "#30d158",
  [SiteCategory.FORUM]: "#5ac8fa",
  [SiteCategory.NSFW]: "#ff3b30",
  [SiteCategory.GAMBLING]: "#ff453a",
  [SiteCategory.SEARCH_ENGINE]: "#aeaeb2",
  [SiteCategory.FINANCE]: "#30d158",
  [SiteCategory.HEALTH]: "#ff375f",
  [SiteCategory.TRAVEL]: "#64d2ff",
  [SiteCategory.FOOD]: "#ff9f0a",
  [SiteCategory.WEATHER]: "#5ac8fa",
  [SiteCategory.GOVERNMENT]: "#aeaeb2",
  [SiteCategory.UNKNOWN]: "#48484a",
};

export function getCategoryColor(category: SiteCategory): string {
  return categoryColors[category] || categoryColors[SiteCategory.UNKNOWN];
}

interface CategoryDotProps {
  category: SiteCategory;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CategoryDot({ category, size = "md", className = "" }: CategoryDotProps) {
  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full shadow-sm ${className}`}
      style={{ backgroundColor: getCategoryColor(category) }}
    />
  );
}
