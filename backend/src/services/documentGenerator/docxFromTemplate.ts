import JSZip from "jszip";
import { htmlToBlocks, type DocBlock, type TableRow, type TextRun } from "./htmlBlocks";

const NAVY = "1A2568";
const TABLE_WIDTH = 10800;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textRunXml(run: TextRun, extra = ""): string {
  const bold = run.bold ? "<w:b/><w:bCs/>" : "";
  const italic = run.italic ? "<w:i/>" : "";
  return `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${bold}${italic}${extra}</w:rPr><w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

function paragraphXml(runs: TextRun[], pPr: string, runExtra = ""): string {
  if (runs.length === 0) {
    return `<w:p><w:pPr>${pPr}</w:pPr></w:p>`;
  }
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.map((run) => textRunXml(run, runExtra)).join("")}</w:p>`;
}

function blocksToXml(blocks: DocBlock[], insideTable = false): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.kind === "pageBreak") {
      continue;
    }
    if (block.kind === "table") {
      parts.push(tableXml(block.rows));
      parts.push(paragraphXml([], `<w:spacing w:after="80"/>`));
      continue;
    }
    if (block.kind === "heading") {
      parts.push(sectionBannerXml(block.text));
      continue;
    }
    if (block.kind === "paragraph") {
      const allBold = block.runs.length > 0 && block.runs.every((run) => run.bold || !run.text.trim());
      if (allBold && !insideTable) {
        parts.push(sectionBannerXml(block.runs.map((run) => run.text).join("")));
        continue;
      }
      parts.push(
        paragraphXml(block.runs, insideTable ? `<w:spacing w:after="80"/>` : `<w:spacing w:after="120"/>`),
      );
      continue;
    }
    block.items.forEach((item, index) => {
      if (block.kind === "numbered") {
        parts.push(paragraphXml([{ text: `${index + 1}. ` }, ...item], `<w:spacing w:after="60"/>`));
        return;
      }
      parts.push(
        paragraphXml(
          item,
          `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="60"/>`,
        ),
      );
    });
  }
  return parts.join("") || "<w:p></w:p>";
}

function sectionBannerXml(text: string): string {
  return tableXml([
    {
      cells: [
        {
          header: true,
          colspan: 1,
          blocks: [{ kind: "paragraph", runs: [{ text, bold: true }] }],
        },
      ],
    },
  ]);
}

function tableXml(rows: TableRow[]): string {
  const columnCount = Math.max(
    1,
    ...rows.map((row) => row.cells.reduce((sum, cell) => sum + cell.colspan, 0)),
  );
  const colWidth = Math.floor(TABLE_WIDTH / columnCount);
  const grid = Array.from({ length: columnCount }, () => `<w:gridCol w:w="${colWidth}"/>`).join("");

  const rowXml = rows
    .map((row) => {
      const cells = row.cells
        .map((cell) => {
          const width = colWidth * cell.colspan;
          const span = cell.colspan > 1 ? `<w:gridSpan w:val="${cell.colspan}"/>` : "";
          const fill = cell.header
            ? `<w:shd w:val="clear" w:color="auto" w:fill="${NAVY}"/>`
            : `<w:shd w:val="clear" w:color="auto" w:fill="FFFFFF"/>`;
          const runExtra = cell.header ? `<w:color w:val="FFFFFF"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/><w:bCs/>` : `<w:sz w:val="22"/><w:szCs w:val="22"/>`;
          const innerBlocks = cell.blocks.length > 0 ? cell.blocks : [{ kind: "paragraph" as const, runs: [] }];
          const inner = innerBlocks
            .map((block) => {
              if (block.kind === "paragraph") {
                const runs = cell.header
                  ? block.runs.map((run) => ({ ...run, bold: true }))
                  : block.runs;
                return paragraphXml(runs, `<w:spacing w:after="40"/>`, runExtra);
              }
              if (block.kind === "heading") {
                return paragraphXml([{ text: block.text, bold: true }], `<w:spacing w:before="80" w:after="40"/>`);
              }
              if (block.kind === "bullets" || block.kind === "numbered") {
                return block.items
                  .map((item, index) =>
                    block.kind === "numbered"
                      ? paragraphXml([{ text: `${index + 1}. ` }, ...item], `<w:spacing w:after="40"/>`)
                      : paragraphXml(
                          item,
                          `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="40"/>`,
                        ),
                  )
                  .join("");
              }
              return "";
            })
            .join("");
          return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${span}${fill}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>${inner || "<w:p></w:p>"}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="${TABLE_WIDTH}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/><w:left w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/><w:right w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/><w:insideH w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/><w:insideV w:val="single" w:sz="8" w:space="0" w:color="${NAVY}"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rowXml}</w:tbl>`;
}

export function htmlToWordBodyXml(html: string): string {
  return blocksToXml(htmlToBlocks(html));
}

function withNextPage(sectXml: string): string {
  if (/<w:type\b/.test(sectXml)) {
    return sectXml.replace(/<w:type\b[^/]*\/>/, '<w:type w:val="nextPage"/>');
  }
  return sectXml.replace(/<w:sectPr([^>]*)>/, '<w:sectPr$1><w:type w:val="nextPage"/>');
}

// The banner artwork on page 1 is slightly taller than the template's top
// margin, so push the body down a bit further to keep it clear of the image.
function firstPageSectionProps(sectXml: string): string {
  return sectXml.replace(/w:top="\d+"/, 'w:top="4250"');
}

function laterSectionProps(sectXml: string): string {
  return sectXml
    .replace(/<w:titlePg\s*\/>/g, "")
    .replace(/w:top="\d+"/g, 'w:top="360"');
}

export function replaceDocumentBody(documentXml: string, html: string): string {
  const bodyOpen = documentXml.match(/<w:body[^>]*>/);
  if (!bodyOpen || bodyOpen.index === undefined) {
    throw new Error("The company template is missing a document body.");
  }
  const bodyStart = bodyOpen.index + bodyOpen[0].length;
  const bodyClose = documentXml.lastIndexOf("</w:body>");
  const sectStart = documentXml.lastIndexOf("<w:sectPr");
  if (bodyClose < 0 || sectStart < 0 || sectStart > bodyClose) {
    throw new Error("The company template is missing page setup for headers and footers.");
  }
  const firstSectXml = documentXml.slice(sectStart, bodyClose);
  const blocks = htmlToBlocks(html);
  const page1: DocBlock[] = [];
  const page2: DocBlock[] = [];
  let onPage2 = false;
  for (const block of blocks) {
    if (block.kind === "pageBreak") {
      onPage2 = true;
      continue;
    }
    (onPage2 ? page2 : page1).push(block);
  }

  const firstPageSect = firstPageSectionProps(firstSectXml);
  const page1Xml = blocksToXml(page1);
  const page2Xml = page2.length > 0 ? blocksToXml(page2) : "";
  const sectionBreak =
    page2.length > 0 ? `<w:p><w:pPr>${withNextPage(firstPageSect)}</w:pPr></w:p>` : "";
  const trailingSect = page2.length > 0 ? laterSectionProps(firstSectXml) : firstPageSect;
  const bodyInnerXml = `${page1Xml}${sectionBreak}${page2Xml}`;

  return `${documentXml.slice(0, bodyStart)}${bodyInnerXml}${trailingSect}${documentXml.slice(bodyClose)}`;
}

export async function generateDocxFromTemplate(templateBytes: Buffer, html: string): Promise<Buffer> {
  const zip = await JSZip.loadAsync(templateBytes);
  const documentFile = zip.file("word/document.xml");
  if (!documentFile) {
    throw new Error("The company template could not be read.");
  }
  const documentXml = await documentFile.async("string");
  const nextXml = replaceDocumentBody(documentXml, html);
  zip.file("word/document.xml", nextXml);

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export interface TemplateChrome {
  header?: Buffer;
  footer?: Buffer;
  headerWidth?: number;
  headerHeight?: number;
  footerWidth?: number;
  footerHeight?: number;
}

function emuToPt(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n / 12700 : undefined;
}

export async function extractHeaderFooterImages(templateBytes: Buffer): Promise<TemplateChrome> {
  const zip = await JSZip.loadAsync(templateBytes);
  const headerXmlName = zip.file("word/header2.xml") ? "word/header2.xml" : "word/header1.xml";
  const footerXmlName = zip.file("word/footer1.xml") ? "word/footer1.xml" : "word/footer2.xml";
  const headerRel = zip.file(`word/_rels/${headerXmlName.slice(5)}.rels`);
  const footerRel = zip.file(`word/_rels/${footerXmlName.slice(5)}.rels`);

  async function imageFromRels(relsFile: { async: (type: "string") => Promise<string> } | null): Promise<Buffer | undefined> {
    if (!relsFile) return undefined;
    const xml = await relsFile.async("string");
    const match = xml.match(/Target="(media\/[^"]+)"/);
    if (!match) return undefined;
    const imageFile = zip.file(`word/${match[1]}`);
    if (!imageFile) return undefined;
    return imageFile.async("nodebuffer");
  }

  async function extentFrom(xmlPath: string): Promise<{ width?: number; height?: number }> {
    const file = zip.file(xmlPath);
    if (!file) return {};
    const xml = await file.async("string");
    return {
      width: emuToPt(xml.match(/cx="(\d+)"/)?.[1]),
      height: emuToPt(xml.match(/cy="(\d+)"/)?.[1]),
    };
  }

  const headerExtent = await extentFrom(headerXmlName);
  const footerExtent = await extentFrom(footerXmlName);

  return {
    header: await imageFromRels(headerRel),
    footer: await imageFromRels(footerRel),
    headerWidth: headerExtent.width,
    headerHeight: headerExtent.height,
    footerWidth: footerExtent.width,
    footerHeight: footerExtent.height,
  };
}
