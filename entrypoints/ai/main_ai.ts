// Chrome Built-in AI - Prompt API initialization
// https://developer.chrome.com/docs/ai/prompt-api

interface AICapabilities {
  available: "readily" | "after-download" | "no";
}

interface AIParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

interface AIPromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
  prefix?: boolean;
}

interface AISessionOptions {
  temperature?: number;
  topK?: number;
  initialPrompts?: AIPromptMessage[];
  signal?: AbortSignal;
  monitor?: (monitor: AIDownloadMonitor) => void;
}

interface AIDownloadMonitor {
  addEventListener(event: "downloadprogress", callback: (e: { loaded: number }) => void): void;
}

interface AIPromptOptions {
  signal?: AbortSignal;
  responseConstraint?: object;
  omitResponseConstraintInput?: boolean;
}

interface AISession {
  prompt(input: string | AIPromptMessage[], options?: AIPromptOptions): Promise<string>;
  promptStreaming(input: string | AIPromptMessage[], options?: AIPromptOptions): ReadableStream;
  destroy(): void;
  clone(options?: { signal?: AbortSignal }): Promise<AISession>;
  inputUsage: number;
  inputQuota: number;
  append(messages: AIPromptMessage[]): Promise<void>;
}

interface LanguageModel {
  availability(): Promise<AICapabilities>;
  create(options?: AISessionOptions): Promise<AISession>;
  params(): Promise<AIParams>;
}

declare global {
  const LanguageModel: LanguageModel;
}

let aiSession: AISession | null = null;
let isAIAvailable = false;
let aiParams: AIParams | null = null;

export async function initializePromptAPI(): Promise<boolean> {
  try {
    if (typeof LanguageModel === "undefined") {
      console.warn("LanguageModel API not available in this browser");
      return false;
    }

    const availability = await LanguageModel.availability();
    console.log("Model Availability:", availability);

    if (availability.available === "no") {
      console.warn("Prompt API not available on this device");
      return false;
    }

    if (availability.available === "after-download") {
      console.log("Model will be downloaded on first use");
    }

    // Get model parameters
    aiParams = await LanguageModel.params();
    console.log("Model Parameters:", aiParams);

    isAIAvailable = true;
    return true;
  } catch (error) {
    console.error("Failed to initialize Prompt API:", error);
    return false;
  }
}

export async function createAISession(options?: AISessionOptions): Promise<AISession | null> {
  if (!isAIAvailable) {
    console.warn("AI not available. Call initializePromptAPI() first.");
    return null;
  }

  try {
    if (aiSession) {
      aiSession.destroy();
    }

    aiSession = await LanguageModel.create(options);
    console.log("AI session created successfully");
    return aiSession;
  } catch (error) {
    console.error("Failed to create AI session:", error);
    return null;
  }
}

export async function getAISession(): Promise<AISession | null> {
  if (aiSession) {
    return aiSession;
  }
  return await createAISession();
}

export function getAIParams(): AIParams | null {
  return aiParams;
}

export function isPromptAPIAvailable(): boolean {
  return isAIAvailable;
}

export function destroyAISession(): void {
  if (aiSession) {
    aiSession.destroy();
    aiSession = null;
  }
}

