import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { htmlToBlocks, type DocBlock, type TableCell, type TableRow, type TextRun } from "./htmlBlocks";
import { extractHeaderFooterImages } from "./docxFromTemplate";

const NAVY = "#1A2568";
const TEXT = "#222222";
const TWIP = 20;

function resolveCalibri(): { regular: string; bold: string } {
  const dir = process.platform === "win32" ? "C:\\Windows\\Fonts" : "/usr/share/fonts/truetype";
  const regular =
    ["calibri.ttf", "Calibri.ttf", "Carlito-Regular.ttf"]
      .map((name) => path.join(dir, name))
      .find((file) => fs.existsSync(file)) ?? "Helvetica";
  const bold =
    ["calibrib.ttf", "Calibri-Bold.ttf", "Carlito-Bold.ttf"]
      .map((name) => path.join(dir, name))
      .find((file) => fs.existsSync(file)) ?? "Helvetica-Bold";
  return { regular, bold };
}

export async function generatePdfBuffer(html: string, templateBytes?: Buffer): Promise<Buffer> {
  const images = templateBytes ? await extractHeaderFooterImages(templateBytes) : {};
  const fonts = resolveCalibri();

  return new Promise((resolve, reject) => {
    const headerHeight = images.header && images.headerHeight ? images.headerHeight : images.header ? 205 : 0;
    const footerHeight = images.footer && images.footerHeight ? images.footerHeight : images.footer ? 38 : 0;
    // Word draws the banner at ~205pt; the PNG is taller, so we must use Word's
    // height (not the image aspect ratio) and start the body just below it.
    const firstTop = images.header ? headerHeight + 22 : 50;
    const laterTop = 360 / TWIP;
    const bottom = images.footer ? 1100 / TWIP : 50;
    const side = 720 / TWIP;

    const doc = new PDFDocument({
      size: "LETTER",
      bufferPages: true,
      margins: { top: firstTop, bottom, left: side, right: side },
    });
    if (fonts.regular !== "Helvetica") {
      doc.registerFont("JD", fonts.regular);
      doc.registerFont("JD-Bold", fonts.bold);
    }
    const face = fonts.regular !== "Helvetica" ? "JD" : "Helvetica";
    const faceBold = fonts.regular !== "Helvetica" ? "JD-Bold" : "Helvetica-Bold";

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const drawImage = (buffer: Buffer, x: number, y: number, width: number, height: number) => {
      doc.image(buffer, x, y, { width, height });
    };

    const drawChrome = (first: boolean) => {
      const saveX = doc.x;
      const saveY = doc.y;
      if (first && images.header) {
        const width = Math.min(images.headerWidth ?? doc.page.width, doc.page.width);
        const height = headerHeight || 205;
        drawImage(images.header, 0, 0, width, height);
      }
      if (images.footer) {
        const height = footerHeight || 38;
        drawImage(images.footer, 0, doc.page.height - height, doc.page.width, height);
      }
      doc.x = saveX;
      doc.y = saveY;
    };

    let pageIndex = 0;
    drawChrome(true);
    doc.on("pageAdded", () => {
      pageIndex++;
      doc.page.margins.top = laterTop;
      doc.x = doc.page.margins.left;
      doc.y = laterTop;
      drawChrome(false);
    });

    const left = doc.page.margins.left;
    const contentWidth = doc.page.width - left - doc.page.margins.right;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;
    const pad = 6;

    const setFont = (bold?: boolean, size = 11) =>
      doc.font(bold ? faceBold : face).fontSize(size);

    const renderRuns = (runs: TextRun[], x: number, width: number, size = 11) => {
      const list = runs.filter((run) => run.text.length > 0);
      if (list.length === 0) return;
      list.forEach((run, index) => {
        setFont(run.bold, size);
        const options = { width, continued: index < list.length - 1, lineGap: 1.5 };
        if (index === 0) {
          doc.text(run.text, x, doc.y, options);
        } else {
          doc.text(run.text, options);
        }
      });
    };

    const measureText = (text: string, width: number, size = 11) => {
      setFont(true, size);
      return doc.heightOfString(text || " ", { width, lineGap: 1.5 });
    };

    const measureCellBlocks = (blocks: DocBlock[], width: number): number => {
      let height = 0;
      for (const block of blocks) {
        if (block.kind === "paragraph") {
          height += measureText(block.runs.map((run) => run.text).join(""), width) + 4;
        } else if (block.kind === "heading") {
          height += measureText(block.text, width, 11) + 4;
        } else if (block.kind === "bullets" || block.kind === "numbered") {
          for (const item of block.items) {
            height += measureText(`•  ${item.map((run) => run.text).join("")}`, width - 8) + 2;
          }
          height += 2;
        }
      }
      return height;
    };

    const renderCellBlocks = (blocks: DocBlock[], x: number, width: number) => {
      doc.fillColor(TEXT);
      for (const block of blocks) {
        if (block.kind === "paragraph") {
          renderRuns(block.runs, x, width);
          doc.y += 4;
        } else if (block.kind === "heading") {
          setFont(true, 11);
          doc.text(block.text, x, doc.y, { width, lineGap: 1.5 });
          doc.y += 4;
        } else if (block.kind === "bullets" || block.kind === "numbered") {
          block.items.forEach((item, index) => {
            const prefix = block.kind === "numbered" ? `${index + 1}.  ` : "•  ";
            renderRuns([{ text: prefix }, ...item], x + 8, width - 8);
            doc.y += 2;
          });
          doc.y += 2;
        }
      }
    };

    const strokeCell = (x: number, y: number, width: number, height: number, header: boolean) => {
      doc.save();
      if (header) {
        doc.rect(x, y, width, height).fill(NAVY);
      }
      doc.lineWidth(0.9).strokeColor(NAVY).rect(x, y, width, height).stroke();
      doc.restore();
    };

    const drawFixedRow = (row: TableRow, columns: number) => {
      const colWidth = contentWidth / columns;
      const isHeaderRow = row.cells.some((cell) => cell.header);
      let rowHeight = isHeaderRow ? 22 : 24;
      row.cells.forEach((cell) => {
        const width = colWidth * cell.colspan - pad * 2;
        rowHeight = Math.max(rowHeight, measureCellBlocks(cell.blocks, width) + pad * 2 - 2);
      });
      const needed = isHeaderRow ? rowHeight + 48 : rowHeight;
      if (doc.y + needed > bottomLimit()) {
        doc.addPage();
      }
      const y = doc.y;
      let col = 0;
      row.cells.forEach((cell) => {
        const x = left + col * colWidth;
        const width = colWidth * cell.colspan;
        strokeCell(x, y, width, rowHeight, cell.header);
        doc.y = y + pad;
        if (cell.header) {
          const text = cell.blocks
            .map((block) => {
              if (block.kind === "paragraph") return block.runs.map((run) => run.text).join("");
              if (block.kind === "heading") return block.text;
              return "";
            })
            .join(" ")
            .trim();
          setFont(true, 12);
          doc.fillColor("#FFFFFF").text(text || " ", x + pad, y + pad - 1, { width: width - pad * 2 });
        } else {
          renderCellBlocks(cell.blocks, x + pad, width - pad * 2);
        }
        col += cell.colspan;
      });
      doc.y = y + rowHeight;
      doc.x = left;
      doc.fillColor(TEXT);
    };

    const drawFlowRow = (cell: TableCell) => {
      const innerWidth = contentWidth - pad * 2;
      const height = measureCellBlocks(cell.blocks, innerWidth) + pad * 2;
      if (doc.y + height <= bottomLimit()) {
        drawFixedRow({ cells: [{ ...cell, colspan: 1 }] }, 1);
        return;
      }
      const startPage = pageIndex;
      const startY = doc.y;
      doc.y = startY + pad;
      renderCellBlocks(cell.blocks, left + pad, innerWidth);
      const endPage = pageIndex;
      const endY = doc.y + pad - 4;
      for (let page = startPage; page <= endPage; page++) {
        doc.switchToPage(page);
        const segTop = page === startPage ? startY : laterTop;
        const segBottom = page === endPage ? endY : bottomLimit();
        doc.save();
        doc.lineWidth(0.9).strokeColor(NAVY).rect(left, segTop, contentWidth, segBottom - segTop).stroke();
        doc.restore();
      }
      doc.switchToPage(endPage);
      doc.y = endY;
      doc.x = left;
    };

    const drawTable = (rows: TableRow[]) => {
      const columns = Math.max(
        1,
        ...rows.map((row) => row.cells.reduce((sum, cell) => sum + cell.colspan, 0)),
      );
      for (const row of rows) {
        if (row.cells.length === 1 && !row.cells[0].header) {
          drawFlowRow(row.cells[0]);
        } else {
          drawFixedRow(row, columns);
        }
      }
      doc.moveDown(0.45);
    };

    const blocks = htmlToBlocks(html);
    setFont(false, 11);

    for (const block of blocks) {
      if (block.kind === "pageBreak") {
        doc.addPage();
        continue;
      }
      if (block.kind === "table") {
        drawTable(block.rows);
        continue;
      }
      if (block.kind === "heading") {
        drawTable([
          {
            cells: [
              {
                header: true,
                colspan: 1,
                blocks: [{ kind: "paragraph", runs: [{ text: block.text, bold: true }] }],
              },
            ],
          },
        ]);
        continue;
      }
      if (block.kind === "paragraph") {
        doc.moveDown(0.2);
        doc.fillColor(TEXT);
        renderRuns(block.runs, left, contentWidth, 11);
        doc.y += 4;
        continue;
      }
      doc.moveDown(0.15);
      doc.fillColor(TEXT);
      block.items.forEach((item, index) => {
        const prefix = block.kind === "numbered" ? `${index + 1}.  ` : "•  ";
        renderRuns([{ text: prefix }, ...item], left + 12, contentWidth - 12, 11);
        doc.y += 3;
      });
    }

    doc.end();
  });
}
