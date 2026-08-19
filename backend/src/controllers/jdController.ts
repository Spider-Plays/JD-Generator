import type { Request, Response } from "express";
import { prisma } from "../models/prisma";
import { extractTextFromFile } from "../services/templateParser";
import { generateCompanyJd } from "../services/jdGenerator";
import { generateDocxBuffer } from "../services/documentGenerator/docxGenerator";
import { generateDocxFromTemplate } from "../services/documentGenerator/docxFromTemplate";
import { generatePdfBuffer } from "../services/documentGenerator/pdfGenerator";
import { generatedJdToHtml } from "../services/documentGenerator/htmlBlocks";
import { igsTemplateStructure, isIgsTemplate } from "../services/igsFormat";
import { removeTempFile } from "../middleware/upload";
import { AppError, USER_ERRORS } from "../utils/errors";
import { toDownloadFilename } from "../utils/text";
import type { GeneratedJd, TemplateStructure } from "../types/jd";

function resolveDownloadHtml(body: { html?: string; jobTitle?: string; sections?: GeneratedJd["sections"] }): string {
  if (typeof body.html === "string" && body.html.trim()) {
    return body.html;
  }
  if (body.jobTitle || body.sections) {
    return generatedJdToHtml(body.jobTitle ?? "", body.sections ?? []);
  }
  throw new AppError("There is no generated JD to download.", 400);
}

async function resolveTemplateBytes(templateId?: string): Promise<Buffer | undefined> {
  const template = templateId
    ? await prisma.template.findUnique({ where: { id: templateId } })
    : await prisma.template.findFirst({ where: { isActive: true } });

  if (template?.originalFile && template.fileType === "docx") {
    return Buffer.from(template.originalFile);
  }

  const builtIn = await prisma.template.findFirst({ where: { isBuiltIn: true } });
  if (builtIn?.originalFile) {
    return Buffer.from(builtIn.originalFile);
  }
  return undefined;
}

export async function extractSourceJd(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    throw new AppError(USER_ERRORS.unsupportedFile, 400);
  }

  try {
    const text = await extractTextFromFile(file.path, file.originalname);
    if (!text) {
      throw new AppError(USER_ERRORS.emptyDocument, 400);
    }
    res.json({ text });
  } finally {
    await removeTempFile(file.path);
  }
}

export async function generateJd(req: Request, res: Response): Promise<void> {
  const templateId = typeof req.body?.templateId === "string" ? req.body.templateId : "";
  const sourceJd = typeof req.body?.sourceJd === "string" ? req.body.sourceJd.trim() : "";

  if (!sourceJd) {
    throw new AppError(USER_ERRORS.noJd, 400);
  }

  const template = templateId
    ? await prisma.template.findUnique({ where: { id: templateId } })
    : await prisma.template.findFirst({ where: { isActive: true } });

  if (!template) {
    throw new AppError(USER_ERRORS.noTemplate, 400);
  }

  const structure = isIgsTemplate(template.name, template.fileName)
    ? igsTemplateStructure("IGS Standard JD")
    : (JSON.parse(template.templateStructure) as TemplateStructure);
  const generated = await generateCompanyJd(structure, template.templateContent, sourceJd);

  await prisma.generatedJd.create({
    data: {
      templateId: template.id,
      jobTitle: generated.jobTitle,
      sourceContent: sourceJd,
      generatedContent: JSON.stringify(generated),
    },
  });

  res.json({
    ...generated,
    html: generated.html || generatedJdToHtml(generated.jobTitle, generated.sections),
  });
}

export async function downloadDocx(req: Request, res: Response): Promise<void> {
  const html = resolveDownloadHtml(req.body ?? {});
  const jobTitle = typeof req.body?.jobTitle === "string" ? req.body.jobTitle : "Job Description";
  const templateBytes = await resolveTemplateBytes(
    typeof req.body?.templateId === "string" ? req.body.templateId : undefined,
  );
  const buffer = templateBytes
    ? await generateDocxFromTemplate(templateBytes, html)
    : await generateDocxBuffer(html);
  const filename = toDownloadFilename(jobTitle, "docx");

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

export async function downloadPdf(req: Request, res: Response): Promise<void> {
  const html = resolveDownloadHtml(req.body ?? {});
  const jobTitle = typeof req.body?.jobTitle === "string" ? req.body.jobTitle : "Job Description";
  const templateBytes = await resolveTemplateBytes(
    typeof req.body?.templateId === "string" ? req.body.templateId : undefined,
  );
  const buffer = await generatePdfBuffer(html, templateBytes);
  const filename = toDownloadFilename(jobTitle, "pdf");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}
