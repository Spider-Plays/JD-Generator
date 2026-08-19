export interface AIGenerateParams {
  systemPrompt: string;
  userPrompt: string;
}

export interface AIProvider {
  readonly name: string;
  generateJson(params: AIGenerateParams): Promise<unknown>;
}

export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(payload);
}
