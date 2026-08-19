import fs from "fs";
import mammoth from "mammoth";
import { AppError, USER_ERRORS } from "../../utils/errors";
import { sanitizeText, templateNameFromFile } from "../../utils/text";
import type { TemplateStructure } from "../../types/jd";
import { detectSectionsFromHtml, detectSectionsFromText } from "./detectSections";
import { igsTemplateStructure, isIgsTemplate } from "../igsFormat";

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (data: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(buffer);
  return result.text ?? "";
}

export async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  const ext = originalName.toLowerCase().slice(originalName.lastIndexOf("."));
  const buffer = await fs.promises.readFile(filePath);

  if (ext === ".txt") {
    return sanitizeText(buffer.toString("utf8"));
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer });
    return sanitizeText(result.value ?? "");
  }

  if (ext === ".pdf") {
    try {
      return sanitizeText(await extractPdfText(buffer));
    } catch {
      throw new AppError(USER_ERRORS.emptyDocument, 400);
    }
  }

  throw new AppError(USER_ERRORS.unsupportedFile, 400);
}

export async function parseTemplate(
  filePath: string,
  originalName: string,
): Promise<{ name: string; fileType: string; content: string; structure: TemplateStructure }> {
  const ext = originalName.toLowerCase().slice(originalName.lastIndexOf("."));
  const name = templateNameFromFile(originalName);
  let content = "";
  let html = "";

  if (ext === ".docx") {
    const buffer = await fs.promises.readFile(filePath);
    const [textResult, htmlResult] = await Promise.all([
      mammoth.extractRawText({ buffer }),
      mammoth.convertToHtml({ buffer }),
    ]);
    content = sanitizeText(textResult.value ?? "");
    html = htmlResult.value ?? "";
  } else {
    content = await extractTextFromFile(filePath, originalName);
  }

  if (!content || content.replace(/\s+/g, "").length < 10) {
    throw new AppError(USER_ERRORS.emptyDocument, 400);
  }

  const igs = isIgsTemplate(name, originalName);
  if (igs) {
    return {
      name: "IGS Standard JD",
      fileType: ext.replace(".", ""),
      content,
      structure: igsTemplateStructure("IGS Standard JD"),
    };
  }

  const fromHtml = html ? detectSectionsFromHtml(html) : [];
  const sections = fromHtml.length > 0 ? fromHtml : detectSectionsFromText(content);

  return {
    name,
    fileType: ext.replace(".", ""),
    content,
    structure: {
      templateName: name,
      sections,
      format: "generic",
    },
  };
}
