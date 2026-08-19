import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  TextRun,
} from "docx";
import { htmlToBlocks, type TextRun as HtmlRun } from "./htmlBlocks";

const headingLevel = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
};

function toRuns(runs: HtmlRun[]): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: run.bold,
        italics: run.italic,
        font: "Calibri",
        size: 22,
      }),
  );
}

export async function generateDocxBuffer(html: string): Promise<Buffer> {
  const blocks = htmlToBlocks(html);
  const children: Paragraph[] = [];

  for (const block of blocks) {
    if (block.kind === "heading") {
      children.push(
        new Paragraph({
          text: block.text,
          heading: headingLevel[block.level],
          spacing: { before: block.level === 1 ? 0 : 240, after: 120 },
        }),
      );
      continue;
    }

    if (block.kind === "paragraph") {
      children.push(
        new Paragraph({
          children: toRuns(block.runs),
          spacing: { after: 160 },
        }),
      );
      continue;
    }

    if (block.kind === "pageBreak") {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (block.kind === "table") {
      for (const row of block.rows) {
        for (const cell of row.cells) {
          for (const inner of cell.blocks) {
            if (inner.kind === "paragraph") {
              children.push(new Paragraph({ children: toRuns(inner.runs), spacing: { after: 80 } }));
            } else if (inner.kind === "heading") {
              children.push(new Paragraph({ text: inner.text, spacing: { after: 80 } }));
            } else if (inner.kind === "bullets" || inner.kind === "numbered") {
              for (const item of inner.items) {
                children.push(new Paragraph({ children: toRuns(item), bullet: { level: 0 }, spacing: { after: 60 } }));
              }
            }
          }
        }
      }
      continue;
    }

    for (const item of block.items) {
      children.push(
        new Paragraph({
          children: toRuns(item),
          numbering:
            block.kind === "numbered"
              ? { reference: "jd-numbered", level: 0 }
              : undefined,
          bullet: block.kind === "bullets" ? { level: 0 } : undefined,
          spacing: { after: 80 },
        }),
      );
    }
  }

  const document = new Document({
    numbering: {
      config: [
        {
          reference: "jd-numbered",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 36, bold: true, font: "Calibri", color: "1F4E79" },
          paragraph: { spacing: { after: 200 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Calibri", color: "2E75B6" },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Calibri", color: "2E75B6" },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
            borders: {
              pageBorderTop: { style: BorderStyle.NONE, size: 0, color: "auto" },
            },
          },
        },
        children: children.length > 0 ? children : [new Paragraph({ text: "" })],
      },
    ],
  });

  return Packer.toBuffer(document);
}
