export function shouldSubmitWhisperAudio(input: { audioSize: number; detectedSpeech: boolean }): boolean {
  return input.audioSize > 0 && input.detectedSpeech;
}
