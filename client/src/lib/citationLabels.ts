export function citationLabels(sources: Array<Record<string, unknown>>) {
  return sources.slice(0, 4).map(source => {
    const title = source.title ?? source.document_name ?? source.source ?? source.name;
    const location = source.section ?? source.page ?? source.clause;
    const illustrative = source.authority_level === "illustrative_dataset";
    const identity = [title, location ? `§ ${location}` : null]
      .filter(Boolean)
      .join(" · ") || "Retrieved legal material";
    return illustrative ? `${identity} · Illustrative dataset — not legal authority` : identity;
  });
}
