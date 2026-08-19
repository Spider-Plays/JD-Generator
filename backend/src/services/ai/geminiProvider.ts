import { GoogleGenerativeAI } from "@google/generative-ai";
import { AppError, USER_ERRORS } from "../../utils/errors";
import type { AIGenerateParams, AIProvider } from "./types";
import { extractJson } from "./types";

const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isUnavailableModel(message: string): boolean {
  return /404|not found|no longer available|not supported/i.test(message);
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateJson(params: AIGenerateParams): Promise<unknown> {
    if (!this.apiKey) {
      throw new AppError(USER_ERRORS.missingAiKey, 500);
    }

    const models = [this.model, ...FALLBACK_MODELS.filter((name) => name !== this.model)];
    let lastError = "";

    for (const modelName of models) {
      try {
        const client = new GoogleGenerativeAI(this.apiKey);
        const model = client.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(`${params.systemPrompt}\n\n${params.userPrompt}`);
        const text = result.response.text();
        return extractJson(text);
      } catch (error) {
        if (error instanceof AppError) throw error;
        lastError = errorMessage(error);
        console.error(`Gemini model ${modelName} failed:`, lastError);
        if (!isUnavailableModel(lastError)) break;
      }
    }

    throw new AppError(USER_ERRORS.aiFailure, 502);
  }
}
