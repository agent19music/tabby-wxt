import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PaperPlaneTiltIcon, XCircleIcon, RobotIcon, UserCircleIcon } from "@phosphor-icons/react";
import {
  createProductChatSession,
  sendMessage,
  getConversationHistory,
  destroySession,
  hasSessionForProduct,
  type ChatMessage,
  type ProductContext,
} from "@/components/functions/current_product/follow_up_questions";
import type { Product } from "@/components/types/db";

interface CurrentProductChatProps {
  product: Product;
}

export const CurrentProductChat: React.FC<CurrentProductChatProps> = ({
  product,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize chat session when product changes
  useEffect(() => {
    const initSession = async () => {
      setIsInitializing(true);
      setSessionError(null);

      try {
        // Destroy existing session if it's for a different product
        if (!hasSessionForProduct(product.id)) {
          destroySession();
          setMessages([]);
        } else {
          // Restore existing conversation
          setMessages(getConversationHistory());
        }

        // Create new session for this product
        const productContext: ProductContext = {
          title: product.title,
          category: product.category,
          price: product.price,
          summary: product.summary,
          pros: product.pros,
          cons: product.cons,
          features: [], // Product type doesn't have features field
          url: product.url,
        };

        await createProductChatSession(productContext, product.id);
      } catch (error) {
        console.error("Failed to initialize chat session:", error);
        setSessionError(
          error instanceof Error
            ? error.message
            : "Failed to start chat session"
        );
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();

    // Cleanup on unmount
    return () => {
      // Note: We don't destroy the session here to preserve conversation
      // Session is destroyed only when switching products
    };
  }, [product.id]);

  // Auto-scroll when messages, streaming content, or loading state changes
  useEffect(() => {
    try {
      // Prefer scrolling the anchor into view to ensure the bottom is visible
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    } catch (e) {
      // Swallow any errors related to scrolling in non-DOM environments
      // (e.g., during SSR) and continue silently.
      // console.warn('Scrolling failed', e);
    }
  }, [messages, streamingMessage, isLoading, isInitializing]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setIsLoading(true);
    setStreamingMessage("");

    console.log('🚀 Sending message:', userMessage);

    try {
      // Send message with streaming
      await sendMessage(userMessage, (chunk) => {
        console.log('📥 Streaming chunk received, length:', chunk.length);
        console.log('📝 Chunk content:', chunk);
        setStreamingMessage(chunk);
      });

      // Update messages from conversation history
      const history = getConversationHistory();
      console.log('💬 Conversation history:', history);
      setMessages(history);
      setStreamingMessage("");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      setSessionError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Session Error */}
      {sessionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2">
            <XCircleIcon size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-500 font-medium">
                Chat Unavailable
              </p>
              <p className="text-xs text-red-500/80 mt-1">{sessionError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Initializing State */}
      {isInitializing && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mb-2"></div>
            <p className="text-sm text-muted-foreground">
              ...
            </p>
          </div>
        </div>
      )}

      {/* Chat Messages Area - this grows upward in the scrollable container */}
      {!isInitializing && !sessionError && messages.length > 0 && (
        <div ref={messagesRef} className="mb-3 max-h-[55vh] overflow-y-auto">
          {/* Messages */}
          <div className="space-y-3 mb-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                    <RobotIcon size={16} className="text-foreground/70" />
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[85%] ${
                    message.role === "user"
                      ? "bg-foreground text-background"
                      : "bg-foreground/5 text-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1.5 ${
                      message.role === "user"
                        ? "text-background/60"
                        : "text-foreground/50"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-foreground/90 flex items-center justify-center shrink-0">
                    <UserCircleIcon size={16} className="text-background" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Streaming message (AI is responding) */}
          {streamingMessage && (
            <div className="flex gap-2 justify-start mb-3">
              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <RobotIcon size={16} className="text-foreground/70" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 max-w-[85%] bg-foreground/5 text-foreground">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingMessage}
                </p>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingMessage && (
            <div className="flex gap-2 justify-start mb-3">
              <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
                <RobotIcon size={16} className="text-foreground/70" />
              </div>
              <div className="rounded-2xl px-4 py-2.5 bg-foreground/5">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll into view */}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Sticky Input Area at Bottom of Viewport - ALWAYS VISIBLE */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/5 px-4 py-3 z-50">
        <div className="max-w-[350px] mx-auto">
          <div className="bg-input rounded-[10px] p-2 relative border border-foreground/5">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about the product..."
              className="w-full bg-transparent outline-none h-[60px] pl-2 pr-10 resize-none rounded-[10px] text-sm"
              disabled={isLoading || sessionError !== null || isInitializing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isInitializing}
              className="absolute right-2 bottom-2 p-2 h-8 w-8 rounded-lg"
              size="sm"
            >
              <PaperPlaneTiltIcon size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

