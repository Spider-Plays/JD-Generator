import { Router } from "express";
import rateLimit from "express-rate-limit";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/errorHandler";
import { downloadDocx, downloadPdf, extractSourceJd, generateJd } from "../controllers/jdController";

const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many generate requests. Please wait and try again." },
});

export const jdRoutes = Router();

jdRoutes.post("/extract", upload.single("file"), asyncHandler(extractSourceJd));
jdRoutes.post("/generate", generateLimiter, asyncHandler(generateJd));
jdRoutes.post("/download/docx", asyncHandler(downloadDocx));
jdRoutes.post("/download/pdf", asyncHandler(downloadPdf));
