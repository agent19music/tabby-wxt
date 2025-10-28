// Content scanner for extracting page data
export interface PageData {
  url: string;
  title: string;
  content: string;
  headings: string[];
  images: string[];
  timestamp: number;
}

export function scanPageContent(): PageData {
  const url = window.location.href;
  const title = document.title;
  const content = document.body.innerText.slice(0, 5000); // First 5000 characters

  // Extract headings
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((h) => h.textContent?.trim())
    .filter(Boolean) as string[];

  // Extract images
  const images = Array.from(document.querySelectorAll("img"))
    .map((img) => img.src)
    .filter((src) => src && !src.includes("data:image"))
    .slice(0, 5); // First 5 images

  return {
    url,
    title,
    content,
    headings,
    images,
    timestamp: Date.now(),
  };
}

// Calculate similarity between two strings
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Normalize title for matching
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}
