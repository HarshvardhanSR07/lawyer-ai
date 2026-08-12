import { describe, expect, it, vi } from "vitest";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({ value: "Clause 4.1   requires 30 days notice." }),
  },
}));

describe("legal document preparation", () => {
  it("converts DOCX content into supported plain text for retrieval", async () => {
    const { DOCX_MIME_TYPE, prepareKnowledgeDocument } = await import("./documentIngestion");
    const prepared = await prepareKnowledgeDocument({
      filename: "agreement.docx",
      mimeType: DOCX_MIME_TYPE,
      bytes: Buffer.from("docx-binary"),
    });

    expect(prepared.filename).toBe("agreement.txt");
    expect(prepared.mimeType).toBe("text/plain");
    expect(prepared.bytes.toString("utf8")).toContain("Clause 4.1");
  });
});
