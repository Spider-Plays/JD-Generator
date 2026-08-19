import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  aiProvider: (process.env.AI_PROVIDER ?? "gemini").toLowerCase(),
  aiApiKey: process.env.AI_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? process.env.AI_API_KEY ?? "",
  aiModel: process.env.AI_MODEL ?? "gemini-3.6-flash",
  maxFileSizeMb,
  maxFileSizeBytes: maxFileSizeMb * 1024 * 1024,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
