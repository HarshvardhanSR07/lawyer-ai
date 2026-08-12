# Indian Lawyer Dataset Ingestion

LawyerAI can use the `Mukesh555/indian_lawyer_dataset` public `default/train` split as **illustrative drafting material**, not as primary legal authority. The source contains `instruction` and `output` fields, so every indexed chunk retains the dataset identifier, split, row number, chunk number, source URL, and an explicit non-authoritative label.

| Approach | Trade-offs | Cost | Setup complexity |
|---|---|---:|---|
| **Automatic persistent indexing** | The always-on backend downloads and idempotently indexes the 1,000-row public split when `INDIAN_LAWYER_DATASET_AUTO_INDEX=true`. The first run may take time because each source chunk is embedded, but later runs only upsert deterministic identifiers. | Uses the existing embedding and Qdrant services. | Low after deployment configuration. |
| **Manual protected indexing trigger** | An operator starts indexing only when desired, avoiding startup work. This adds an operational step and risks the dataset remaining unavailable after a fresh deployment. | Uses the existing embedding and Qdrant services. | Moderate. |

The implementation selects **automatic persistent indexing** when enabled because the requested deployment is already always-on and the dataset should be integrated in full. The health endpoint exposes a dataset-indexing status so readiness checks distinguish a healthy RAG service from an in-progress corpus import.

## Safety and provenance policy

1. Dataset chunks are retrieved as examples only and carry `authority_level: illustrative_dataset`.
2. The reasoning prompt labels these chunks as non-authoritative, disallows presenting them as statutes or reported judgments, and requires an authoritative source before a legal conclusion is approved.
3. Citation data shown to users includes the Hugging Face dataset name, split, row number, and the non-authoritative label.
4. Ingestion is bounded, paginated, and uses deterministic UUID point identifiers, making a restart or repeated deployment safe.
