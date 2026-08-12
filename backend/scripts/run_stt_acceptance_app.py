"""Run a minimal FastAPI application that serves LawyerAI's real STT route for proxy acceptance testing."""

from contextlib import asynccontextmanager
from pathlib import Path
import sys

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main
from voice.whisper import WhisperTranscriber


@asynccontextmanager
async def minimal_lifespan(_app):
    transcriber = WhisperTranscriber()
    await transcriber.initialize()
    previous_transcriber = main.whisper_transcriber
    main.whisper_transcriber = transcriber
    try:
        yield
    finally:
        main.whisper_transcriber = previous_transcriber
        await transcriber.close()


main.app.router.lifespan_context = minimal_lifespan

if __name__ == "__main__":
    uvicorn.run(main.app, host="127.0.0.1", port=8123)
