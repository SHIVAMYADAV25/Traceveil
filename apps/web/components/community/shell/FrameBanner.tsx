import Image from "next/image";

/**
 * The group's banner, laid across the top of the frame and faded out downward. The sidebar's top and the header
 * both sit on it, which is what ties them together. Changing group fades the new picture in.
 */
export function FrameBanner({ src, height = 210 }: { src: string; height?: number }) {
  const mask = "linear-gradient(to bottom, #000 25%, transparent 100%)";
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" style={{ height, maskImage: mask, WebkitMaskImage: mask }} aria-hidden>
      <Image key={src} src={src} alt="" fill priority sizes="100vw" className="cm-fade object-cover object-[75%_32%] opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--cm-frame)]/60 via-transparent to-transparent" />
    </div>
  );
}
