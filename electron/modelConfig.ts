// Shared with the renderer. Keep this module free of Electron and Node imports.
export type APIProvider = "openai" | "gemini" | "anthropic";
export const DEFAULT_PROVIDER: APIProvider = "gemini";

export const MODEL_PROVIDERS = {
  openai: {
    defaultModel: "gpt-4o",
    models: [
      { id: "gpt-4o", name: "gpt-4o", description: "General-purpose model" },
      { id: "gpt-4o-mini", name: "gpt-4o-mini", description: "Smaller model option" },
    ],
  },
  gemini: {
    defaultModel: "gemini-2.0-flash",
    models: [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Pro model option" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Flash model option" },
    ],
  },
  anthropic: {
    defaultModel: "claude-3-7-sonnet-20250219",
    models: [
      { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", description: "Sonnet 3.7 model" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Sonnet 3.5 model" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "Opus 3 model" },
    ],
  },
};
