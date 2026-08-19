export type SectionType = "title" | "paragraph" | "bullets";

export interface TemplateSection {
  title: string;
  type: SectionType;
  order: number;
}

export interface TemplateInfo {
  templateId: string;
  name: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  sections: TemplateSection[];
  isBuiltIn?: boolean;
}

export interface GeneratedSection {
  title: string;
  type?: SectionType;
  content?: string;
  items?: string[];
}

export interface GeneratedJd {
  jobTitle: string;
  sections: GeneratedSection[];
  html?: string;
}

export function generatedJdToHtml(jd: GeneratedJd): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const parts: string[] = [];
  if (jd.jobTitle.trim()) parts.push(`<h1>${escape(jd.jobTitle.trim())}</h1>`);

  for (const section of jd.sections) {
    if (section.title.trim()) parts.push(`<h2>${escape(section.title.trim())}</h2>`);
    if (section.items && section.items.length > 0) {
      parts.push(`<ul>${section.items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>`);
    } else if (section.content?.trim()) {
      const paragraphs = section.content
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, "<br>")}</p>`);
      parts.push(...paragraphs);
    }
  }

  return parts.join("");
}

export function htmlToJobTitle(html: string): string {
  const heading = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (heading) {
    const title = heading[1].replace(/<[^>]+>/g, "").trim();
    if (title) return title;
  }
  const labeled = html.match(/Job Title:\s*([^<]+)/i);
  if (labeled) return labeled[1].trim() || "Job Description";
  return "Job Description";
}
