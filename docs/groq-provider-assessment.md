# Groq Provider Assessment

## Assessment date

2026-08-14

## Confirmed integration contract

Groq documents an OpenAI-compatible client configuration using `https://api.groq.com/openai/v1` and `GROQ_API_KEY`. This makes it suitable for LawyerAI's text-generation and reasoning calls after the existing verification contract is tested against a selected production model.

## Embedding compatibility finding

The official Groq supported-model catalog lists text-generation models and Whisper speech-to-text models, but it does not list an embeddings endpoint or an embedding model. LawyerAI's Qdrant collections currently depend on 768-dimensional remote embeddings. Therefore, `GROQ_API_KEY` cannot safely replace `OPENAI_API_KEY` for existing document ingestion and retrieval without separately selecting, implementing, and reindexing against a compatible embedding provider.

## Safe transition boundary

The Groq credential may be used for legal-reasoning generation. The existing OpenAI credential must remain available for embeddings until a compatible embedding-provider migration is implemented, Qdrant collections are reindexed, and retrieval regressions pass. Removing it immediately would stop legal-document indexing and could make retrieval fail.

## Sources

- Groq OpenAI Compatibility: https://console.groq.com/docs/openai
- Groq Supported Models: https://console.groq.com/docs/models
