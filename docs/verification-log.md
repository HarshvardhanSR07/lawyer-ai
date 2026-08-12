# Visual Verification Log

## 2026-08-11 — Public and Assistant UI

The `/` landing page was visually checked at a 1280 × 960 desktop viewport. It now presents **Verified Legal Assistance**, routes authenticated users to `/assistant`, and contains no courtroom or real-time-transcription claim.

The `/assistant` page was visually checked at the same viewport. The preserved 2D avatar remains visible while the renderer connects, the conversation panel accurately describes verified response delivery, and the typed-question, upload, screen-share, reconnect, and end-session controls remain visible.

## 2026-08-11 — Render-only Avatar Boundary

`AvatarBeyondPresence` is a dedicated remote-video surface with only a video host reference and visibility flag. `LiveAvatarStage` mounts it only while `showVideo` is true and renders `AvatarFallback` otherwise. The post-extraction TypeScript check and the full Vitest suite passed: **10 test files / 14 tests**.

## 2026-08-11 — Fallback Mouth-motion Audit

`AvatarFallback` passes only a status phase and `isPlaying` marker to the preserved `DialogueAvatar`; it does **not** pass an audio-driven `mouthShape`. The fallback therefore remains visually static at a closed mouth, while lip movement is reserved for the remote Beyond Presence video produced from the verified Rime audio track.

## 2026-08-11 — Verified Rime Playback State

The assistant now enters `speaking` only after `audio.play()` resolves for a verified Rime response, and returns to `listening` when that audio ends or fails. Renderer audio and renderer-originated assistant transcription are ignored. The standard regression suite now includes the client playback-state test and passed with **11 test files / 16 tests**.

## 2026-08-11 — Renderer Relay Failure Fallback

The assistant’s actual remote-video visibility rule now has focused regression coverage. It shows Beyond Presence video only for a speaking response with a healthy renderer track, and keeps `AvatarFallback` visible when either the renderer or response-audio relay is unavailable. The expanded suite passed with **12 test files / 19 tests**.

## 2026-08-12 — Whisper Voice Control

The `/assistant` page was visually rechecked at a 1280 × 960 desktop viewport after the Whisper integration. The control now reads **Voice ready**, matching the queued automatic microphone-listening behavior, while the text question input remains visible as the fallback. The fallback avatar remains rendered while the remote renderer connects.
