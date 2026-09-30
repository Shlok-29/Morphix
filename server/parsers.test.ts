import { describe, expect, it } from "vitest";
import { extractNormalizedText } from "./parsers";

describe("source parsers", () => {
  it("normalizes plain text and markdown source content", async () => {
    const result = await extractNormalizedText(Buffer.from("  # Brief\n\nA grounded note.  "), "text/markdown", "brief.md");
    expect(result.parser).toBe("plain-text");
    expect(result.text).toBe("# Brief\n\nA grounded note.");
    expect(result.pages).toBeNull();
  });

  it("keeps unsupported files metadata-only instead of guessing content", async () => {
    const result = await extractNormalizedText(Buffer.from([1, 2, 3]), "image/png", "scan.png");
    expect(result.parser).toBe("metadata-only");
    expect(result.text).toBe("");
  });
});
