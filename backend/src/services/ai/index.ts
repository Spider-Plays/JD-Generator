import { env } from "../../config/env";
import { AppError } from "../../utils/errors";
import type { AIProvider } from "./types";
import { GeminiProvider } from "./geminiProvider";
import { OpenAIProvider } from "./openaiProvider";
import { GroqProvider } from "./groqProvider";

export function getAIProvider(): AIProvider {
  switch (env.aiProvider) {
    case "openai":
      return new OpenAIProvider(env.openaiApiKey, env.aiModel || "gpt-4o-mini");
    case "groq":
      return new GroqProvider(env.groqApiKey, env.aiModel || "llama-3.3-70b-versatile");
    case "gemini":
      return new GeminiProvider(env.aiApiKey, env.aiModel || "gemini-3.6-flash");
    default:
      throw new AppError(`Unsupported AI provider: ${env.aiProvider}`, 500);
  }
}
