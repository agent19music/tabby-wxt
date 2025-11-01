import React, { useEffect, useRef } from "react";
import { RobotIcon, UserCircleIcon } from "@phosphor-icons/react";
import { ChatMessage } from "@/components/functions/current_product/follow_up_questions";

interface CurrentProductMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  streamingMessage?: string;
}

export const CurrentProductMessages: React.FC<CurrentProductMessagesProps> = ({
  messages,
  isLoading = false,
  streamingMessage = "",
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  return (
    <div className="flex-1 overflow-y-auto space-y-3 p-3 min-h-0">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <RobotIcon size={48} className="text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Ask me anything about this product!
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            I'll help you understand its features, pros, and cons.
          </p>
        </div>
      )}

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

      {/* Streaming message (AI is responding) */}
      {streamingMessage && (
        <div className="flex gap-2 justify-start">
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
        <div className="flex gap-2 justify-start">
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

      <div ref={messagesEndRef} />
    </div>
  );
};
