import mammoth from "mammoth";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const;
export type UploadedDocumentMimeType = "application/pdf" | "text/plain" | typeof DOCX_MIME_TYPE;

export async function prepareKnowledgeDocument(input: { filename: string; mimeType: UploadedDocumentMimeType; bytes: Buffer }) {
  if (input.mimeType !== DOCX_MIME_TYPE) {
    return {
      filename: input.filename,
      mimeType: input.mimeType as "application/pdf" | "text/plain",
      bytes: input.bytes,
    };
  }

  const extracted = await mammoth.extractRawText({ buffer: input.bytes });
  const text = extracted.value.replace(/\s{3,}/g, "\n\n").trim();
  if (!text) throw new Error("The DOCX document did not contain readable text for legal retrieval.");

  return {
    filename: `${input.filename.replace(/\.docx$/i, "") || "document"}.txt`,
    mimeType: "text/plain" as const,
    bytes: Buffer.from(text, "utf8"),
  };
}
