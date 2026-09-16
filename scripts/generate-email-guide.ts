import { config as loadDotenvFile } from "dotenv";
import { readFile, mkdir, rename, rm } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { finished } from "node:stream/promises";
import { marked, type Token } from "marked";
import PDFDocument from "pdfkit";
import { getFounderIdentity } from "../lib/email/recall/rules";

async function main() {
  const root = process.cwd();
  const productionEnv = resolve(root, ".env");
  const envResult = loadDotenvFile({
    path: productionEnv,
    quiet: true,
  });
  if (envResult.error) {
    throw new Error(
      `Unable to load production environment file (${productionEnv}): ${envResult.error.message}`,
    );
  }
  const source = resolve(
    root,
    process.env.PDF_MD_PATH?.trim() || "org_guide.md",
  );
  let markdown: string;
  try {
    markdown = await readFile(source, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(
        `PDF skipped: Markdown file not found (${source}). Existing PDF was preserved.`,
      );
      return;
    }
    throw error;
  }
  // Bilingual guides may have an English section followed by another language.
  const lines = markdown.split(/\r?\n/);
  const englishIndex = lines.findIndex((line) =>
    /^#{1,6}\s+English\s*$/i.test(line.trim()),
  );
  if (englishIndex >= 0) {
    const level = lines[englishIndex].trim().match(/^#+/)![0].length;
    const end = lines.findIndex(
      (line, index) =>
        index > englishIndex &&
        new RegExp(`^#{1,${level}}\\s+`).test(line.trim()),
    );
    markdown = lines
      .slice(englishIndex + 1, end < 0 ? undefined : end)
      .join("\n");
  }
  if (!markdown.trim())
    throw new Error("The English guide is empty; existing PDF was preserved.");
  const { siteConfig } = await import(
    pathToFileURL(resolve(root, "config/site.ts")).href
  );
  const common = JSON.parse(
    await readFile(resolve(root, "i18n/messages/en/common.json"), "utf8"),
  );
  const founder = getFounderIdentity(siteConfig.url);
  const output = resolve(root, "public/emails/product-guide.pdf");
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  const document = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    info: {
      Title: `${siteConfig.name} - Product Guide`,
      Author: `${founder.name} | ${siteConfig.name}`,
    },
  });
  const stream = createWriteStream(temporary);
  const completion = finished(stream);
  // Handle errors from either stream without leaving a partial published PDF.
  document.on("error", (error) => stream.destroy(error));
  void completion.catch(() => {});
  document.pipe(stream);

  function plain(value: string): string {
    return value
      .replace(/<[^>]*>/g, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/\*\*|__|`/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "");
  }
  function room(height: number) {
    if (document.y + height > document.page.height - 65) document.addPage();
  }
  function paragraph(text: string, font = "Helvetica", size = 10.5) {
    const clean = plain(text).trim();
    if (!clean) return;
    room(30);
    document
      .font(font)
      .fontSize(size)
      .fillColor("#334155")
      .text(clean, { lineGap: 4, paragraphGap: 6 });
    document.moveDown(0.5);
  }
  function renderTokens(tokens: Token[]) {
    for (const token of tokens) {
      switch (token.type) {
        case "heading":
          room(75);
          document.moveDown(0.4);
          paragraph(token.text, "Helvetica-Bold", token.depth <= 2 ? 17 : 13);
          break;
        case "paragraph":
        case "text":
          paragraph(token.text);
          break;
        case "list":
          for (const [index, item] of token.items.entries())
            paragraph(`${token.ordered ? `${index + 1}.` : "-"} ${item.text}`);
          break;
        case "table":
          // Vertical rows stay readable on a narrow PDF page, including long Markdown cells.
          for (const row of token.rows) {
            paragraph(
              row
                .map(
                  (cell: { text: string }, index: number) =>
                    `${token.header[index]?.text || ""}: ${cell.text}`,
                )
                .join("\n"),
            );
          }
          break;
        case "blockquote":
          renderTokens(token.tokens || []);
          break;
        case "code":
          paragraph(token.text, "Courier", 9);
          break;
        case "html":
          paragraph(token.text);
          break;
        case "hr":
          document.moveDown(0.5);
          break;
      }
    }
  }
  try {
    document
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#0f766e")
      .text("PRODUCT GUIDE", { characterSpacing: 2 });
    document.moveDown();
    document
      .font("Helvetica-Bold")
      .fontSize(30)
      .fillColor("#0f172a")
      .text(plain(siteConfig.name));
    paragraph(common.Home?.tagLine || "", "Helvetica", 13);
    paragraph(common.Home?.description || "");
    document.moveDown();
    renderTokens(marked.lexer(markdown));
    room(125);
    paragraph("A note from the founder", "Helvetica-Bold", 14);
    paragraph(
      `I'm ${founder.name}, the founder of ${siteConfig.name}. If you have a question or need help getting started, reply to my email or contact me directly.`,
    );
    document
      .fontSize(10.5)
      .fillColor("#0f766e")
      .text(founder.email, { link: `mailto:${founder.email}` });
    document.text(siteConfig.url, { link: siteConfig.url });
    const pages = document.bufferedPageRange();
    for (let page = pages.start; page < pages.start + pages.count; page++) {
      document.switchToPage(page);
      // Footer text sits inside the bottom margin; disable automatic page breaks here.
      const bottomMargin = document.page.margins.bottom;
      document.page.margins.bottom = 0;
      document
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          `${plain(siteConfig.name)}  |  ${page + 1} / ${pages.count}`,
          48,
          document.page.height - 35,
          { lineBreak: false, width: document.page.width - 96, align: "right" },
        );
      document.page.margins.bottom = bottomMargin;
    }
    document.end();
    await completion;
    const file = await readFile(temporary);
    if (file.length > 3 * 1024 * 1024)
      throw new Error("Generated PDF exceeds the 3 MiB attachment limit");
    await rename(temporary, output);
    console.log(
      `PDF generated: ${output} (${pages.count} pages, ${Math.ceil(file.length / 1024)} KiB)`,
    );
  } catch (error) {
    document.destroy();
    stream.destroy();
    await completion.catch(() => {});
    await rm(temporary, { force: true });
    throw error;
  }
}

main().catch((error) => {
  console.error(
    "PDF generation failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
