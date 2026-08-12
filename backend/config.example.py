"""
Backend Configuration Template

Copy this to config.py and fill in your actual values.
"""

# Qdrant Vector Database
QDRANT_URL = "http://localhost:6333"

# Hugging Face API
HUGGINGFACE_API_KEY = "your_huggingface_api_key_here"
REASONING_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"
EMBEDDINGS_MODEL = "intfloat/multilingual-e5-large"

# Rime Voice API
RIME_API_KEY = "your_rime_api_key_here"
RIME_API_URL = "https://api.rime.ai/v1"
RIME_VOICE_ID = "professional-lawyer"

# Whisper STT
WHISPER_API_KEY = "your_whisper_api_key_here"
WHISPER_MODEL = "base"

# FastAPI Server
FASTAPI_PORT = 8000
FASTAPI_HOST = "0.0.0.0"

# Logging
LOG_LEVEL = "INFO"

# Case Configuration
DEFAULT_CLIENT_NAME = "Client"
DEFAULT_CASE_TYPE = "Contract dispute"
