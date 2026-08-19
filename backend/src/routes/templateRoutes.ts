import { Router } from "express";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/errorHandler";
import { deleteTemplate, getActiveTemplate, uploadTemplate } from "../controllers/templateController";

export const templateRoutes = Router();

templateRoutes.post("/upload", upload.single("file"), asyncHandler(uploadTemplate));
templateRoutes.get("/active", asyncHandler(getActiveTemplate));
templateRoutes.delete("/:id", asyncHandler(deleteTemplate));
