interface AvatarBeyondPresenceProps {
  videoHostRef: React.RefObject<HTMLDivElement | null>;
  isVisible: boolean;
}

/**
 * A render-only surface for the remote Beyond Presence video track.
 * It never receives text, microphone audio, STT, or reasoning inputs.
 */
export function AvatarBeyondPresence({ videoHostRef, isVisible }: AvatarBeyondPresenceProps) {
  return (
    <div
      ref={videoHostRef}
      aria-hidden={!isVisible}
      className={`absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover ${isVisible ? "block" : "hidden"}`}
    />
  );
}
