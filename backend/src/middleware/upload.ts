import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { env } from "../config/env";
import { AppError, USER_ERRORS } from "../utils/errors";

const ALLOWED_EXTENSIONS = new Set([".docx", ".pdf", ".txt"]);
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/plain",
  "application/octet-stream",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `jd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new AppError(USER_ERRORS.unsupportedFile, 400));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSizeBytes },
});

export async function removeTempFile(filePath?: string): Promise<void> {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Temporary files are best-effort cleanup.
  }
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}
