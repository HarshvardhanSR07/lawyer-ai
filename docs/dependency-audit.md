# Production Dependency Audit

The production build failure originated from an invalid Python package pin. `qdrant-client==2.7.0` is not published on PyPI. The corrected pin is `qdrant-client==1.19.0`, which PyPI identifies as the current release and documents as requiring Python 3.10 or newer.[1]

The existing `torch==2.1.1` requirement does not provide a Python 3.12-compatible wheel, which was confirmed by the package resolver. LawyerAI uses its OpenAI embedding provider in the configured production path, but retains Torch and Transformers as the optional local embedding fallback. The Docker base is therefore pinned to `node:22-bookworm-slim`, whose Debian Bookworm runtime provides Python 3.11 and remains compatible with the pinned local-fallback packages.

The Node dependency lockfile resolves reproducibly with `pnpm install --frozen-lockfile --offline`. The Python requirements resolve for the Python 3.11 target with the corrected Qdrant pin.

## Sources

[1]: https://pypi.org/project/qdrant-client/ "PyPI — qdrant-client 1.19.0"
[2]: https://pytorch.org/get-started/previous-versions/ "PyTorch — Previous Versions"
