import os
import base64
import httpx
import uvicorn
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Load environment variables from .env file
load_dotenv()

# API Keys
RIME_API_KEY = os.getenv("RIME_API_KEY", "")
BEY_API_KEY = os.getenv("BEY_API_KEY", "")
BEY_AVATAR_ID = os.getenv("BEY_AVATAR_ID", "")

from backend.ai.reasoning import generate_reasoning
from backend.database.db import get_or_create_user, get_history
from backend.api.uploads import process_pdf
from backend.api.speech import transcribe_audio
import backend.rag.constitution # Load Constitution on startup

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/api/login")
async def login(request: Request):
    data = await request.json()
    username = data.get("username", "Guest")
    user_id = get_or_create_user(username)
    history = get_history(user_id)
    return JSONResponse(content={"user_id": user_id, "history": history})

@app.post("/api/upload")
async def upload_case_record(file: UploadFile = File(...), user_id: int = Form(...)):
    result = await process_pdf(file, user_id)
    return JSONResponse(content=result)

@app.get("/api/bey-video-status/{video_id}")
async def get_bey_video_status(video_id: str):
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"https://api.bey.dev/v1/videos/{video_id}",
                headers={"x-api-key": BEY_API_KEY},
                timeout=10.0
            )
            if res.status_code == 200:
                return JSONResponse(content=res.json())
            return JSONResponse(content={"status": "error", "message": res.text})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)})

async def generate_avatar_and_speech(text: str, user_id: int):
    # 1. Grounded Reasoning (RAG)
    reasoning_result = generate_reasoning(text, user_id)
    voice_text = reasoning_result["voice_text"]
    
    # 2. Beyond Presence Video Avatar Generation (Async)
    bey_video_id = None
    try:
        async with httpx.AsyncClient() as client:
            bey_res = await client.post(
                "https://api.bey.dev/v1/videos",
                json={
                    "input_type": "text",
                    "avatar_id": BEY_AVATAR_ID,
                    "name": "Lawyer AI Fjolla Response",
                    "script": voice_text,
                    "language": "en"
                },
                headers={
                    "x-api-key": BEY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            if bey_res.status_code == 201:
                bey_data = bey_res.json()
                bey_video_id = bey_data.get("id")
    except Exception as e:
        print(f"Beyond Presence API Error: {e}")

    # 3. Rime AI Speech Synthesis (Rime MCP / TTS API)
    audio_base64 = None
    try:
        async with httpx.AsyncClient() as client:
            # Try mist model with 'abbie' voice first, fallback to v1 / marsh
            payload = {
                "text": voice_text,
                "speaker": "abbie",
                "modelId": "mist"
            }
            response = await client.post(
                "https://users.rime.ai/v1/rime-tts",
                json=payload,
                headers={
                    "Authorization": f"Bearer {RIME_API_KEY}",
                    "Accept": "audio/mp3",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code != 200:
                # Fallback request
                payload = {
                    "text": voice_text,
                    "speaker": "marsh",
                    "modelId": "v1"
                }
                response = await client.post(
                    "https://users.rime.ai/v1/rime-tts",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {RIME_API_KEY}",
                        "Accept": "audio/mp3",
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
            if response.status_code == 200:
                audio_base64 = base64.b64encode(response.content).decode("utf-8")
    except Exception as e:
        print(f"Rime TTS Error: {e}")

    reasoning_result["audio_b64"] = audio_base64
    reasoning_result["bey_video_id"] = bey_video_id
    reasoning_result["query_text"] = text
    return reasoning_result

@app.post("/api/chat")
async def chat_text(request: Request):
    data = await request.json()
    text = data.get("text", "").strip()
    user_id = data.get("user_id", 1)
    
    if not text:
        return JSONResponse(content={"error": "Text prompt cannot be empty."})
        
    result = await generate_avatar_and_speech(text, user_id)
    return JSONResponse(content=result)

@app.post("/api/speech-to-speech")
async def speech_to_speech(audio: UploadFile = File(...), user_id: int = Form(...)):
    audio_bytes = await audio.read()
    transcribed_text = transcribe_audio(audio_bytes)
    
    if transcribed_text.startswith("[") and ("error" in transcribed_text.lower() or "unavailable" in transcribed_text.lower()):
        return JSONResponse(content={"error": transcribed_text})
        
    if transcribed_text == "[Could not understand the audio]":
        return JSONResponse(content={"error": "Could not understand the audio. Please speak clearly into the microphone."})

    result = await generate_avatar_and_speech(transcribed_text, user_id)
    result["transcribed_text"] = transcribed_text
    return JSONResponse(content=result)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
