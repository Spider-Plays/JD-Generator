import OpenAI from "openai";
import { AppError, USER_ERRORS } from "../../utils/errors";
import type { AIGenerateParams, AIProvider } from "./types";
import { extractJson } from "./types";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateJson(params: AIGenerateParams): Promise<unknown> {
    if (!this.apiKey) {
      throw new AppError(USER_ERRORS.missingAiKey, 500);
    }

    try {
      const client = new OpenAI({ apiKey: this.apiKey });
      const completion = await client.chat.completions.create({
        model: this.model || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      });

      const text = completion.choices[0]?.message?.content ?? "";
      return extractJson(text);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(USER_ERRORS.aiFailure, 502);
    }
  }
}
