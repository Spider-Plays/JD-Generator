import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { templateRoutes } from "./routes/templateRoutes";
import { jdRoutes } from "./routes/jdRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { AppError, USER_ERRORS } from "./utils/errors";
import { prisma } from "./models/prisma";
import { ensureDefaultIgsTemplate } from "./services/templateStore/seedDefaultTemplate";

const app = express();

app.use(
  cors({
    origin: env.corsOrigin.split(",").map((value) => value.trim()),
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/templates", templateRoutes);
app.use("/api/jd", jdRoutes);

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof err === "object" && err && "code" in err && (err as { code?: string }).code === "LIMIT_FILE_SIZE") {
    next(new AppError(USER_ERRORS.fileTooLarge, 400));
    return;
  }
  errorHandler(err, req, res, next);
});

async function start() {
  await prisma.$connect();
  await ensureDefaultIgsTemplate();
  app.listen(env.port, "0.0.0.0", () => {
    console.log(`JD Formatter API listening on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
