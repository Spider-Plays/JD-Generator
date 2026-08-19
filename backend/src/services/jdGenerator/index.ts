import { getAIProvider } from "../ai";
import { buildJdPrompt } from "./promptBuilder";
import { AppError, USER_ERRORS } from "../../utils/errors";
import type { GeneratedJd, GeneratedSection, SectionType, TemplateStructure } from "../../types/jd";
import { buildIgsPrompt, igsToGeneratedJd, normalizeIgsGenerated } from "../igsFormat";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function asType(value: unknown, fallback: SectionType): SectionType {
  if (value === "title" || value === "paragraph" || value === "bullets") return value;
  return fallback;
}

export function normalizeGeneratedJd(raw: unknown, template: TemplateStructure): GeneratedJd {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawSections = Array.isArray(data.sections) ? data.sections : [];

  const mapped: GeneratedSection[] = [];
  for (const section of rawSections) {
    if (!section || typeof section !== "object") continue;
    const item = section as Record<string, unknown>;
    const title = asString(item.title);
    if (!title) continue;
    const type = asType(item.type, asItems(item.items).length > 0 ? "bullets" : "paragraph");
    mapped.push({
      title,
      type,
      content: asString(item.content),
      items: asItems(item.items),
    });
  }

  const byTitle = new Map(mapped.map((section) => [section.title.toLowerCase(), section]));

  const sections =
    template.sections.length > 0
      ? template.sections.map((templateSection) => {
          const match = byTitle.get(templateSection.title.toLowerCase());
          return {
            title: templateSection.title,
            type: match?.type ?? templateSection.type,
            content: match?.content ?? "",
            items: match?.items ?? [],
          };
        })
      : mapped;

  const extras = mapped.filter(
    (section) =>
      template.sections.length === 0 ||
      !template.sections.some((item) => item.title.toLowerCase() === section.title.toLowerCase()),
  );

  const merged = [...sections, ...extras];
  if (template.brandingPrefix) {
    const aboutIndex = merged.findIndex((section) => /about\s+igs/i.test(section.title));
    const brandingBody = template.brandingPrefix.replace(/^About IGS:\s*/i, "").trim();
    if (aboutIndex >= 0) {
      if (!merged[aboutIndex].content?.trim() && (merged[aboutIndex].items?.length ?? 0) === 0) {
        merged[aboutIndex] = { ...merged[aboutIndex], type: "paragraph", content: brandingBody };
      }
    } else {
      merged.unshift({
        title: "About IGS",
        type: "paragraph",
        content: brandingBody,
        items: [],
      });
    }
  }

  return {
    jobTitle: asString(data.jobTitle) || "Job Description",
    sections: merged,
  };
}

export async function generateCompanyJd(
  template: TemplateStructure,
  templateContent: string,
  sourceJd: string,
): Promise<GeneratedJd> {
  if (!sourceJd.trim()) {
    throw new AppError(USER_ERRORS.noJd, 400);
  }

  const provider = getAIProvider();
  if (template.format === "igs") {
    const prompt = buildIgsPrompt(sourceJd);
    const raw = await provider.generateJson(prompt);
    return igsToGeneratedJd(normalizeIgsGenerated(raw));
  }

  const prompt = buildJdPrompt(template, templateContent, sourceJd);
  const raw = await provider.generateJson(prompt);
  return normalizeGeneratedJd(raw, template);
}
