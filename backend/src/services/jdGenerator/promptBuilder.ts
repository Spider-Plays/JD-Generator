import type { TemplateStructure } from "../../types/jd";

export function buildJdPrompt(template: TemplateStructure, templateContent: string, sourceJd: string) {
  const sectionList =
    template.sections.length > 0
      ? template.sections.map((section) => `- ${section.title} (${section.type})`).join("\n")
      : "- Infer sections only from the company template text below.";

  const systemPrompt = `You are a job description formatter and restructurer, not a requirement inventor.

Rules:
1. Preserve all meaningful job requirements.
2. Do not invent skills, responsibilities, experience or qualifications.
3. Do not increase or decrease required experience unless the source JD says so.
4. Preserve mandatory technologies and domain requirements.
5. Remove duplication.
6. Improve grammar and professional wording.
7. Follow the company's section order.
8. Use the company's terminology and formatting style where appropriate.
9. If a section is not supported by the source JD, leave content empty and items as an empty array.
10. If the company template includes a company introduction such as "About IGS", keep that wording exactly. Do not replace it with another company description.
11. Return JSON only. No markdown.

Return JSON in this exact shape:
{
  "jobTitle": "string",
  "sections": [
    {
      "title": "string",
      "type": "title" | "paragraph" | "bullets",
      "content": "string",
      "items": ["string"]
    }
  ]
}

Use the company's section titles and order. Put bullet-style content in items. Put paragraph/title content in content.`;

  const userPrompt = `This is the company's approved JD template/format.

Detected sections (use this order when present):
${sectionList}

Extracted template text:
${templateContent}

This is the source JD that must be converted.

${sourceJd}

Convert the source JD into the company's approved structure. Do not fabricate requirements.`;

  return { systemPrompt, userPrompt };
}
