import io
import wave
import struct
import speech_recognition as sr

def transcribe_audio(file_bytes: bytes) -> str:
    """
    Converts raw audio bytes (WAV from browser) to text using Google's free STT.
    The browser frontend records directly as WAV (PCM) to avoid needing ffmpeg.
    """
    try:
        recognizer = sr.Recognizer()
        audio_file = io.BytesIO(file_bytes)
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data)
            return text
    except sr.UnknownValueError:
        return "[Could not understand the audio]"
    except sr.RequestError as e:
        print(f"STT service error: {e}")
        return "[Speech recognition service unavailable]"
    except Exception as e:
        print(f"STT Error: {e}")
        return f"[Audio processing error: {str(e)}]"
