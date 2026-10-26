import Image from "next/image";

/** The calm watercolour used for empty states and the entry page. Same artwork as the support pages, never a face. */
export function QuietIllustration({ className = "", src = "/community/banners/start-here.webp" }: { className?: string; src?: string }) {
  return (
    <div className={`overflow-hidden rounded-3xl ${className}`}>
      <Image src={src} alt="" width={1600} height={533} sizes="(min-width: 768px) 520px, 90vw" className="h-auto w-full" priority={false} />
    </div>
  );
}
