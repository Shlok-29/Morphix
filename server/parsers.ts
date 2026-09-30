import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export async function extractNormalizedText(buffer: Buffer, mimeType: string, filename: string) {
  const lowerName = filename.toLowerCase();
  if (mimeType.includes("pdf") || lowerName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text.trim(), pages: result.total ?? null, parser: "pdf-parse" };
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType.includes("word") || lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value.trim(), pages: null, parser: "mammoth" };
  }

  if (mimeType.startsWith("text/") || lowerName.endsWith(".md") || lowerName.endsWith(".json")) {
    return { text: buffer.toString("utf8").trim(), pages: null, parser: "plain-text" };
  }

  return { text: "", pages: null, parser: "metadata-only" };
}
