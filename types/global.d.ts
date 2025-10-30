export {};

declare const defineBackground: <T>(factory: () => T) => T;
declare const defineContentScript: <T>(config: T) => T;

declare const chrome: {
  storage: {
    local: {
      get(keys: null | string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      clear(): Promise<void>;
    };
    onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string
        ) => void
      ): void;
      removeListener(callback: (...args: unknown[]) => void): void;
    };
  };
  runtime: {
    sendMessage?<T = unknown>(message: unknown): Promise<T>;
    onMessage: {
      addListener(
        listener: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => void
      ): void;
    };
    onInstalled: {
      addListener(listener: (...args: unknown[]) => void): void;
    };
  };
  offscreen?: {
    createDocument?(options: Record<string, unknown>): Promise<void>;
  };
  webNavigation?: {
    onCompleted: {
      addListener(listener: (details: Record<string, unknown>) => void): void;
    };
  };
  tabs?: {
    sendMessage?<T = unknown>(tabId: number, message: unknown): Promise<T>;
    onUpdated: {
      addListener(
        listener: (
          tabId: number,
          changeInfo: Record<string, unknown>,
          tab: Record<string, unknown>
        ) => void
      ): void;
    };
  };
  windows?: {
    getCurrent(): Promise<{ id?: number }>;
  };
  sidePanel?: {
    open?(options: { windowId?: number }): Promise<void>;
  };
  history?: {
    search(query: { text: string; startTime: number; maxResults: number }): Promise<
      Array<{ url?: string }>
    >;
  };
  scripting?: {
    executeScript(options: Record<string, unknown>): Promise<Array<{ result?: unknown }>>;
  };
};

declare global {
  interface Window {
    ai?: {
      prompt(prompt: string): Promise<string>;
      createTextSession?: () => Promise<{
        prompt(prompt: string): Promise<string>;
      }>;
    };
  }
}
