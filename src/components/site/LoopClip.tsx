/** A short muted looping clip with a transparent background, used like an animated image. Decorative. */
export function LoopClip({
  src,
  width,
  height,
  className,
}: {
  src: string;
  /** Intrinsic size, so the page doesn't shift when the clip loads. */
  width: number;
  height: number;
  className?: string;
}) {
  return (
    <video className={className} width={width} height={height} autoPlay muted loop playsInline aria-hidden="true">
      <source src={src} type="video/webm" />
    </video>
  );
}
