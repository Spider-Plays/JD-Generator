import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type DocBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; runs: TextRun[] }
  | { kind: "bullets"; items: TextRun[][] }
  | { kind: "numbered"; items: TextRun[][] }
  | { kind: "table"; rows: TableRow[] }
  | { kind: "pageBreak" };

export interface TableCell {
  header: boolean;
  colspan: number;
  blocks: DocBlock[];
}

export interface TableRow {
  cells: TableCell[];
}

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

function collectRuns(node: AnyNode, $: cheerio.CheerioAPI, inherited: { bold?: boolean; italic?: boolean } = {}): TextRun[] {
  const runs: TextRun[] = [];

  if (node.type === "text") {
    const text = node.data ?? "";
    if (text) runs.push({ text, bold: inherited.bold, italic: inherited.italic });
    return runs;
  }

  if (node.type !== "tag") return runs;

  const tag = node.tagName.toLowerCase();
  const next = {
    bold: inherited.bold || tag === "strong" || tag === "b",
    italic: inherited.italic || tag === "em" || tag === "i",
  };

  if (tag === "br") {
    runs.push({ text: "\n", bold: next.bold, italic: next.italic });
    return runs;
  }

  $(node)
    .contents()
    .each((_, child) => {
      runs.push(...collectRuns(child, $, next));
    });

  return runs;
}

function runsText(runs: TextRun[]): string {
  return runs.map((run) => run.text).join("").trim();
}

export function htmlToBlocks(html: string): DocBlock[] {
  const $ = cheerio.load(html || "");
  const blocks = parseChildren($, $("body").children().toArray());
  if (blocks.length === 0) {
    const text = $.root().text().trim();
    if (text) return [{ kind: "paragraph", runs: [{ text }] }];
  }
  return blocks;
}

function parseChildren($: cheerio.CheerioAPI, elements: AnyNode[]): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const element of elements) {
    if (element.type !== "tag") continue;
    const tag = element.tagName.toLowerCase();

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = $(element).text().trim();
      if (text) {
        blocks.push({ kind: "heading", level: Number(tag.slice(1)) as 1 | 2 | 3, text });
      }
      continue;
    }

    if (tag === "hr") {
      blocks.push({ kind: "pageBreak" });
      continue;
    }

    if (tag === "ul" || tag === "ol") {
      const items = $(element)
        .children("li")
        .toArray()
        .map((li) => collectRuns(li, $))
        .filter((runs) => runsText(runs));
      if (items.length > 0) {
        blocks.push({ kind: tag === "ol" ? "numbered" : "bullets", items });
      }
      continue;
    }

    if (tag === "table") {
      const rows: TableRow[] = [];
      $(element)
        .find("tr")
        .each((_, tr) => {
          const cells: TableCell[] = $(tr)
            .children("th,td")
            .toArray()
            .map((cell) => {
              const header = cell.type === "tag" && cell.tagName.toLowerCase() === "th";
              const colspan = Number($(cell).attr("colspan") || 1);
              const inner = parseChildren($, $(cell).children().toArray());
              const fallback = collectRuns(cell, $);
              return {
                header,
                colspan: Number.isFinite(colspan) && colspan > 0 ? colspan : 1,
                blocks: inner.length > 0 ? inner : runsText(fallback) ? [{ kind: "paragraph", runs: fallback }] : [],
              };
            });
          if (cells.length > 0) rows.push({ cells });
        });
      if (rows.length > 0) blocks.push({ kind: "table", rows });
      continue;
    }

    if (tag === "div") {
      const nested = parseChildren($, $(element).children().toArray());
      if (nested.length > 0) {
        blocks.push(...nested);
        continue;
      }
    }

    if (tag === "p" || tag === "div") {
      if ($(element).find("hr").length > 0) {
        blocks.push({ kind: "pageBreak" });
        continue;
      }
      const runs = collectRuns(element, $);
      if (runsText(runs)) {
        blocks.push({ kind: "paragraph", runs });
      }
    }
  }
  return blocks;
}

export function generatedJdToHtml(jobTitle: string, sections: { title: string; content?: string; items?: string[] }[]): string {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const parts: string[] = [];
  if (jobTitle.trim()) parts.push(`<h1>${escape(jobTitle.trim())}</h1>`);

  for (const section of sections) {
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
