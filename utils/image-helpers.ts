export type OptimizedImageSize = 'thumbnail' | 'medium' | 'large';

const SIZE_WIDTH_MAP: Record<OptimizedImageSize, number> = {
  thumbnail: 120,
  medium: 320,
  large: 640,
};

export function getOptimizedImageUrl(
  url?: string | null,
  size: OptimizedImageSize = 'medium'
): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'https://localhost' : window.location.href);
    // Attach sizing hint for image CDNs that respect width params.
    const width = SIZE_WIDTH_MAP[size];
    const existingParam = parsed.searchParams.get('w');
    if (!existingParam) {
      parsed.searchParams.set('w', String(width));
    }
    parsed.searchParams.set('auto', 'format');
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function extractDominantColor(imageUrl: string): Promise<string> {
  if (!imageUrl) {
    return 'rgba(0,0,0,0.1)';
  }

  try {
    const response = await fetch(imageUrl, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : (typeof document !== 'undefined' ? document.createElement('canvas') : null);

    if (!canvas) {
      return 'rgba(0,0,0,0.25)';
    }

    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context || typeof (context as OffscreenCanvasRenderingContext2D).drawImage !== 'function') {
      return 'rgba(0,0,0,0.25)';
    }

  const ctx = context as OffscreenCanvasRenderingContext2D;
  ctx.drawImage(bitmap, 0, 0, 1, 1);
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  const r = pixel[0] ?? 0;
  const g = pixel[1] ?? 0;
  const b = pixel[2] ?? 0;
  const a = pixel[3] ?? 255;

  return `rgba(${r}, ${g}, ${b}, ${Number((a / 255).toFixed(2))})`;
  } catch (error) {
    console.warn('[ImageHelpers] Dominant color extraction failed', error);
    return 'rgba(0,0,0,0.1)';
  }
}
