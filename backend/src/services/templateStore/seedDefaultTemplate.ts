import fs from "fs";
import path from "path";
import { prisma } from "../../models/prisma";
import { parseTemplate } from "../templateParser";

export const DEFAULT_TEMPLATE_NAME = "IGS Standard JD";
export const DEFAULT_TEMPLATE_FILE = "IGS_JD_Template.docx";

export function defaultTemplatePath(): string {
  return path.resolve(__dirname, "../../../assets", DEFAULT_TEMPLATE_FILE);
}

export async function ensureDefaultIgsTemplate(): Promise<void> {
  const filePath = defaultTemplatePath();
  if (!fs.existsSync(filePath)) {
    console.warn("IGS default template file was not found at", filePath);
    return;
  }

  const parsed = await parseTemplate(filePath, DEFAULT_TEMPLATE_FILE);
  const originalFile = await fs.promises.readFile(filePath);
  const existing = await prisma.template.findFirst({ where: { isBuiltIn: true } });

  if (existing) {
    await prisma.template.update({
      where: { id: existing.id },
      data: {
        name: DEFAULT_TEMPLATE_NAME,
        fileName: DEFAULT_TEMPLATE_FILE,
        fileType: "docx",
        templateContent: parsed.content,
        templateStructure: JSON.stringify(parsed.structure),
        originalFile,
        isBuiltIn: true,
      },
    });
  } else {
    await prisma.template.updateMany({ data: { isActive: false }, where: { isActive: true } });
    await prisma.template.create({
      data: {
        name: DEFAULT_TEMPLATE_NAME,
        fileName: DEFAULT_TEMPLATE_FILE,
        fileType: "docx",
        templateContent: parsed.content,
        templateStructure: JSON.stringify(parsed.structure),
        originalFile,
        isActive: true,
        isBuiltIn: true,
      },
    });
  }

  const active = await prisma.template.findFirst({ where: { isActive: true } });
  if (!active || active.name === "tmp template" || !active.originalFile) {
    await prisma.template.updateMany({ data: { isActive: false }, where: { isActive: true } });
    await prisma.template.updateMany({ where: { isBuiltIn: true }, data: { isActive: true } });
  }
}
