import { describe, expect, it } from "vitest";
import { citationLabels } from "./citationLabels";

describe("citationLabels", () => {
  it("labels illustrative Indian Lawyer dataset rows as non-authoritative", () => {
    expect(citationLabels([{
      source: "Indian Lawyer Dataset — Illustrative Example",
      section: "Row 12",
      authority_level: "illustrative_dataset",
    }])).toEqual([
      "Indian Lawyer Dataset — Illustrative Example · § Row 12 · Illustrative dataset — not legal authority",
    ]);
  });

  it("keeps primary-source labels concise", () => {
    expect(citationLabels([{ source: "Indian Contract Act", section: "Section 10" }])).toEqual([
      "Indian Contract Act · § Section 10",
    ]);
  });
});
