/** A short muted video that loops like an animated image. Hidden from screen readers (decorative). */
export function LoopClip({ src, className }: { src: string; className?: string }) {
  return (
    <video className={className} autoPlay muted loop playsInline preload="none" aria-hidden="true">
      <source src={src} type="video/webm" />
    </video>
  );
}
