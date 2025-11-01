// Summarizer API using Chrome's built-in AI

declare global {
  interface Window {
    Summarizer: any;
  }
  const Summarizer: any;
}

export interface SummarizerOptions {
  type?: 'key-points' | 'tldr' | 'teaser' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
  sharedContext?: string;
}

/**
 * Check if the Summarizer API is available
 */
export async function isSummarizerAvailable(): Promise<boolean> {
  if (!('Summarizer' in self)) {
    return false;
  }
  
  try {
    const availability = await Summarizer.availability();
    return availability !== 'unavailable';
  } catch (error) {
    console.error('Error checking summarizer availability:', error);
    return false;
  }
}

/**
 * Create a summary of the given text
 */
export async function createSummary(
  text: string,
  options: SummarizerOptions = {}
): Promise<string | null> {
  try {
    // Check if API is available
    if (!('Summarizer' in self)) {
      throw new Error('Summarizer API is not available in this browser');
    }

    // Check availability
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      throw new Error('Summarizer API is not available on this device');
    }

    // Default options
    const summarizerOptions = {
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.sharedContext || 'This is a product page',
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`Model download: ${Math.round(e.loaded * 100)}%`);
        });
      }
    };

    // Create summarizer
    const summarizer = await Summarizer.create(summarizerOptions);

    // Generate summary
    const summary = await summarizer.summarize(text);

    // Clean up
    summarizer.destroy();

    return summary;
  } catch (error) {
    console.error('Error creating summary:', error);
    throw error;
  }
}

/**
 * Create a streaming summary of the given text
 */
export async function* createStreamingSummary(
  text: string,
  options: SummarizerOptions = {}
): AsyncGenerator<string, void, unknown> {
  try {
    // Check if API is available
    if (!('Summarizer' in self)) {
      throw new Error('Summarizer API is not available in this browser');
    }

    // Check availability
    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      throw new Error('Summarizer API is not available on this device');
    }

    // Default options
    const summarizerOptions = {
      type: options.type || 'key-points',
      format: options.format || 'markdown',
      length: options.length || 'medium',
      sharedContext: options.sharedContext || 'This is a product page',
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`Model download: ${Math.round(e.loaded * 100)}%`);
        });
      }
    };

    // Create summarizer
    const summarizer = await Summarizer.create(summarizerOptions);

    // Generate streaming summary
    const stream = summarizer.summarizeStreaming(text);

    for await (const chunk of stream) {
      yield chunk;
    }

    // Clean up
    summarizer.destroy();
  } catch (error) {
    console.error('Error creating streaming summary:', error);
    throw error;
  }
}

/**
 * Get product summary from current product data
 */
export async function summarizeProductPage(
  productContent: string,
  productTitle?: string,
  summaryType: 'key-points' | 'tldr' | 'teaser' = 'key-points'
): Promise<string | null> {
  const context = productTitle 
    ? `This is a product page for: ${productTitle}` 
    : 'This is a product page';

  return createSummary(productContent, {
    type: summaryType,
    format: 'markdown',
    length: 'medium',
    sharedContext: context
  });
}
