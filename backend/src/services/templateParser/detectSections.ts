import type { SectionType, TemplateSection } from "../../types/jd";

const SKIP_HEADING_WORDS = new Set(["page", "confidential", "draft", "internal"]);

const HEADING_HINT =
  /\b(title|summary|description|responsib|duties|skill|experience|education|location|qualif|require|about|role|benefit|compensat|employment|department|report|overview|mission|preferred|mandatory|who you|what you|nice to have|key dut|work type|notice period)\b/i;

function isStrongHeading(line: string): boolean {
  const text = line.replace(/^#{1,6}\s+/, "").replace(/[:：]\s*$/, "").trim();
  if (/^#{1,6}\s+\S/.test(line)) return true;
  if (/[:：]\s*$/.test(line)) return true;
  if (/^\d+[\.)]\s+[A-Z]/.test(line) && text.length < 60) return true;
  if (/^[A-Z][A-Z0-9 &/()'+-]{2,}$/.test(text) && /[A-Z]{2,}/.test(text)) return true;
  return false;
}

function isTitleCaseHeading(text: string): boolean {
  if (!/^[A-Z][A-Za-z0-9 &/()'+-]*$/.test(text) || text.split(" ").length > 6) return false;
  const words = text.split(/\s+/);
  return words.every(
    (word) => /^[A-Z0-9]/.test(word) || ["and", "or", "of", "the", "for", "to", "in"].includes(word),
  );
}

function hasBodyCue(line: string): boolean {
  const trimmed = line.trim();
  if (/^[-•*]\s+|^\d+[\.)]\s+/.test(trimmed)) return true;
  if (trimmed.length > 70) return true;
  if (/[.?!]/.test(trimmed)) return true;
  return false;
}

function looksLikeHeading(line: string, nextContentLine?: string): boolean {
  const text = line.replace(/^#{1,6}\s+/, "").replace(/[:：]\s*$/, "").trim();
  if (text.length < 2 || text.length > 80) return false;
  if (/[.?!]$/.test(text)) return false;
  if (/^https?:\/\//i.test(text)) return false;
  if (SKIP_HEADING_WORDS.has(text.toLowerCase())) return false;
  if (/^[-•*]\s+/.test(text)) return false;
  if (isStrongHeading(line)) return true;
  if (!isTitleCaseHeading(text)) return false;
  if (HEADING_HINT.test(text)) return true;
  return Boolean(nextContentLine && hasBodyCue(nextContentLine));
}

function normalizeHeading(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\d+[\.)]\s+/, "")
    .replace(/[:：]\s*$/, "")
    .trim();
}

function inferType(body: string): SectionType {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "paragraph";
  const bulletCount = lines.filter((line) => /^[-•*]\s+|^\d+[\.)]\s+/.test(line)).length;
  if (bulletCount >= Math.max(2, Math.ceil(lines.length * 0.5))) return "bullets";
  return "paragraph";
}

export function detectSectionsFromText(text: string): TemplateSection[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const headingIndexes: { index: number; title: string; strong: boolean }[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const nextContentLine = lines.slice(index + 1).find((item) => item.trim());
    if (looksLikeHeading(trimmed, nextContentLine)) {
      headingIndexes.push({
        index,
        title: normalizeHeading(trimmed),
        strong: isStrongHeading(trimmed) || HEADING_HINT.test(normalizeHeading(trimmed)),
      });
    }
  });

  const unique: { index: number; title: string; strong: boolean }[] = [];
  for (const heading of headingIndexes) {
    if (unique.some((item) => item.title.toLowerCase() === heading.title.toLowerCase())) continue;
    unique.push(heading);
  }

  const kept = unique.filter((heading, order) => {
    const start = heading.index + 1;
    const end = order + 1 < unique.length ? unique[order + 1].index : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    return heading.strong || Boolean(body);
  });

  if (kept.length === 0) return [];

  return kept.map((heading, order) => {
    const start = heading.index + 1;
    const end = order + 1 < kept.length ? kept[order + 1].index : lines.length;
    const body = lines.slice(start, end).join("\n").trim();
    const type: SectionType = order === 0 && heading.title.toLowerCase().includes("title") ? "title" : inferType(body);
    return {
      title: heading.title,
      type,
      order: order + 1,
    };
  });
}

export function detectSectionsFromHtml(html: string): TemplateSection[] {
  const headingMatches = [...html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi)];
  if (headingMatches.length === 0) return [];

  const sections: TemplateSection[] = headingMatches.map((match, index) => {
    const title = stripTags(match[1] ?? "").trim();
    const start = (match.index ?? 0) + match[0].length;
    const next = headingMatches[index + 1];
    const end = next?.index ?? html.length;
    const bodyHtml = html.slice(start, end);
    const hasList = /<(ul|ol)[\s>]/i.test(bodyHtml);
    return {
      title: title || `Section ${index + 1}`,
      type: hasList ? "bullets" : (index === 0 && /title/i.test(title) ? "title" : "paragraph"),
      order: index + 1,
    };
  });

  return sections.filter((section) => section.title.length > 0);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}
