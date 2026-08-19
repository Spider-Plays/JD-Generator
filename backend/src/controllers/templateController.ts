import type { Request, Response } from "express";
import fs from "fs";
import { prisma } from "../models/prisma";
import { parseTemplate } from "../services/templateParser";
import { removeTempFile } from "../middleware/upload";
import { AppError, USER_ERRORS } from "../utils/errors";
import type { TemplateResponse, TemplateStructure } from "../types/jd";
import { IGS_SECTIONS, isIgsTemplate } from "../services/igsFormat";

function toResponse(template: {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  createdAt: Date;
  templateStructure: string;
  isBuiltIn: boolean;
}): TemplateResponse {
  const structure = JSON.parse(template.templateStructure) as TemplateStructure;
  return {
    templateId: template.id,
    name: template.name,
    fileName: template.fileName,
    fileType: template.fileType,
    createdAt: template.createdAt.toISOString(),
    sections: isIgsTemplate(template.name, template.fileName)
      ? IGS_SECTIONS
      : (structure.sections ?? []),
    isBuiltIn: template.isBuiltIn,
  };
}

export async function uploadTemplate(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    throw new AppError(USER_ERRORS.unsupportedFile, 400);
  }

  try {
    const parsed = await parseTemplate(file.path, file.originalname);
    const originalFile = await fs.promises.readFile(file.path);
    await prisma.template.updateMany({ data: { isActive: false }, where: { isActive: true } });

    const created = await prisma.template.create({
      data: {
        name: parsed.name,
        fileName: file.originalname,
        fileType: parsed.fileType,
        templateContent: parsed.content,
        templateStructure: JSON.stringify(parsed.structure),
        originalFile,
        isActive: true,
        isBuiltIn: false,
      },
    });

    res.status(201).json(toResponse(created));
  } finally {
    await removeTempFile(file.path);
  }
}

export async function getActiveTemplate(_req: Request, res: Response): Promise<void> {
  const template = await prisma.template.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!template) {
    res.json(null);
    return;
  }

  res.json(toResponse(template));
}

export async function deleteTemplate(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(USER_ERRORS.notFound, 404);
  }
  if (existing.isBuiltIn) {
    throw new AppError("The IGS default template cannot be removed. You can replace it with another file.", 400);
  }

  await prisma.template.delete({ where: { id } });
  await prisma.template.updateMany({ where: { isBuiltIn: true }, data: { isActive: true } });
  const restored = await prisma.template.findFirst({ where: { isBuiltIn: true } });
  res.json(restored ? toResponse(restored) : null);
}
