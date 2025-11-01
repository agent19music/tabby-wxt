/**
 * AI Chat Session Manager for Product Q&A
 * 
 * Uses Chrome Prompt API to create conversational sessions about products.
 * Maintains context using initialPrompts and session history.
 */

import { scanPageContent } from "../content_scanner";

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ProductContext {
  title: string;
  category: string;
  price?: string;
  summary?: string;
  pros?: string[];
  cons?: string[];
  features?: string[];
  url: string;
}

interface ChatSession {
  session: any; // LanguageModel session
  messages: ChatMessage[];
  productId: string;
}

let currentSession: ChatSession | null = null;

/**
 * Create a new AI chat session with product context
 */
export async function createProductChatSession(
  product: ProductContext,
  productId: string
): Promise<void> {
  try {
   
    const text=scanPageContent().content

    const productInfo = `
Product: ${product.title}
Category: ${product.category}
content:${text}
    `.trim();

const availability = await LanguageModel.availability();


    const session = await  LanguageModel.create({
      temperature: 0.7,
      topK: 40,
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`📥 Model downloading: ${Math.round(e.loaded * 100)}%`);
          
        });
      },
      initialPrompts: [
        {
          role: 'system',
          content: `You are a helpful shopping assistant with expertise in product analysis and recommendations. 
You are helping a user understand this specific product:

${productInfo}

Your role is to:
- Answer questions about this product based on the information provided
- Provide helpful comparisons and insights
- Be honest about the pros and cons
- Help the user make an informed decision
- If asked about information not in the product details, acknowledge you don't have that specific information but provide helpful general guidance
- Keep responses concise and friendly (2-3 sentences unless more detail is specifically requested)

Always base your answers on the product information provided above.`
        }
      ]
    });

    // Store the session
    currentSession = {
      session,
      messages: [],
      productId
    };

  } catch (error) {
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    throw error;
  }
}

export async function sendMessage(
  userMessage: string,
  streamCallback?: (chunk: string) => void
): Promise<ChatMessage> {
  if (!currentSession) {
    throw new Error('No active chat session. Create a session first.');
  }

  const userChatMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: userMessage,
    timestamp: Date.now()
  };
  currentSession.messages.push(userChatMessage);
  try {
    let assistantResponse = '';

    if (streamCallback) {
      console.log('🔄 Starting streaming response...');

      // Stream the response
      const stream = currentSession.session.promptStreaming(userMessage);

      console.log('📡 Stream created, iterating chunks...');

      // Accumulate chunks. Some streaming implementations emit incremental deltas
      // (single tokens or short snippets). Append each chunk so the final
      // assistantResponse contains the full output instead of only the last token.
      for await (const chunk of stream) {
        try {
          console.log('📦 Received chunk, length:', chunk.length);
          assistantResponse += chunk;
          // Send the accumulated content to the UI so it shows progressive output
          streamCallback(assistantResponse);
        } catch (e) {
          console.warn('Error while processing stream chunk', e);
        }
      }

      console.log('✅ Streaming complete, final response length:', assistantResponse.length);
    } else {
      console.log('🔄 Getting non-streaming response...');
      assistantResponse = await currentSession.session.prompt(userMessage);
      console.log('✅ Response received, length:', assistantResponse.length);
    }

    // Add assistant message to history
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: assistantResponse,
      timestamp: Date.now()
    };
    
    currentSession.messages.push(assistantMessage);


    if (currentSession.messages.length > 10) {
      currentSession.messages = currentSession.messages.slice(-10);
    }

    console.log('💾 Message saved to history');
    return assistantMessage;
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    throw error;
  }
}

/**
 * Get conversation history
 */
export function getConversationHistory(): ChatMessage[] {
  return currentSession?.messages || [];
}

/**
 * Get session info
 */
export function getSessionInfo(): { inputUsage: number; inputQuota: number } | null {
  if (!currentSession?.session) return null;
  
  return {
    inputUsage: currentSession.session.inputUsage || 0,
    inputQuota: currentSession.session.inputQuota || 0
  };
}

/**
 * Check if session exists for a product
 */
export function hasSessionForProduct(productId: string): boolean {
  return currentSession?.productId === productId;
}

/**
 * Destroy current session
 */
export function destroySession(): void {
  if (currentSession?.session) {
    currentSession.session.destroy();
    currentSession = null;
    console.log('Chat session destroyed');
  }
}

/**
 * Generate suggested follow-up questions
 */
export async function generateFollowUpQuestions(
  product: ProductContext
): Promise<string[]> {
  try {
    const ai = (self as any).ai;
    
    if (!ai || !ai.languageModel) {
      return getDefaultFollowUpQuestions(product);
    }
    

    const availability = await ai.languageModel.availability();
    
    if (availability === 'unavailable') {
      return getDefaultFollowUpQuestions(product);
    }

    // Create a temporary session just for generating questions
    const tempSession = await ai.languageModel.create({
      temperature: 0.5,
      topK: 20,
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          console.log(`Model downloading for follow-up questions: ${Math.round(e.loaded * 100)}%`);
        });
      }
    });

    const prompt = `Given this product, suggest 3 helpful follow-up questions a customer might ask:

Product: ${product.title}
Category: ${product.category}

Generate exactly 3 short, specific questions (under 10 words each) that would help someone decide whether to buy this product. Format as a simple numbered list.`;

    const response = await tempSession.prompt(prompt);
    tempSession.destroy();

    // Parse the response to extract questions
    const questions = response
      .split('\n')
      .filter((line: string) => line.match(/^\d+\.|^-|^\*/))
      .map((line: string) => line.replace(/^\d+\.|\s*-\s*|\s*\*\s*/, '').trim())
      .filter((q: string) => q.length > 0)
      .slice(0, 3);

    return questions.length > 0 ? questions : getDefaultFollowUpQuestions(product);
  } catch (error) {
    console.error('Failed to generate follow-up questions:', error);
    return getDefaultFollowUpQuestions(product);
  }
}

/**
 * Default follow-up questions based on product category
 */
function getDefaultFollowUpQuestions(product: ProductContext): string[] {
  const category = product.category.toLowerCase();
  
  const questionsByCategory: { [key: string]: string[] } = {
    headphones: [
      'How is the sound quality?',
      'Is it comfortable for long use?',
      'What is the battery life?'
    ],
    laptop: [
      'How is the performance for multitasking?',
      'What is the battery life?',
      'Is it good for gaming?'
    ],
    phone: [
      'How is the camera quality?',
      'What is the battery life?',
      'Is it worth the price?'
    ],
    default: [
      'What are the main advantages?',
      'Are there any major drawbacks?',
      'Is it worth the price?'
    ]
  };

  return questionsByCategory[category] || questionsByCategory.default;
}
