"use client";

import { useState, type MouseEvent } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Privacy-first image preview.
 *
 * Images a user uploads (or picks from the demo set) are shown softly blurred by default,
 * with a small control to reveal them. This protects the user from shoulder-surfing and from
 * being startled by their own content. The blur is visual only: the original file is never
 * altered, and the blur is removed when printing so evidence reports stay legible.
 *
 * Works uncontrolled (own state, starts blurred) or controlled via `blurred` + `onBlurredChange`
 * (use controlled to share one switch across several images, e.g. the demo grid).
 */

// Class names are written out in full so Tailwind can see them.
const STRENGTH = {
  sm: "blur-[3px]", // thumbnails up to ~48px
  md: "blur-[6px]", // standard previews
} as const;

type BlurImageProps = {
  src: string;
  alt: string;
  /** Sizing, border and radius of the frame (e.g. "w-24 h-24 rounded-xl border"). */
  className?: string;
  /** How the picture fills its frame. */
  fit?: "cover" | "contain";
  strength?: keyof typeof STRENGTH;
  /** Controlled mode. Omit to let the component manage its own state (default: blurred). */
  blurred?: boolean;
  onBlurredChange?: (blurred: boolean) => void;
  /** Show the small eye button on the image. Turn off when you render a <BlurToggle> elsewhere. */
  showToggle?: boolean;
};

export function BlurImage({
  src,
  alt,
  className = "",
  fit = "cover",
  strength = "md",
  blurred,
  onBlurredChange,
  showToggle = true,
}: BlurImageProps) {
  const [internal, setInternal] = useState(true);
  const isBlurred = blurred ?? internal;

  function toggle(e: MouseEvent) {
    // the frame often sits inside a clickable card or dropzone
    e.stopPropagation();
    e.preventDefault();
    const next = !isBlurred;
    if (blurred === undefined) setInternal(next);
    onBlurredChange?.(next);
  }

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full transition duration-200 ${fit === "cover" ? "object-cover" : "object-contain"} ${
          isBlurred ? `${STRENGTH[strength]} scale-105 print:blur-none print:scale-100` : ""
        }`}
      />
      {showToggle && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!isBlurred}
          aria-label={isBlurred ? "Unblur image" : "Blur image"}
          title={isBlurred ? "Unblur image" : "Blur image"}
          className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-colors hover:bg-black/75 print:hidden"
        >
          {isBlurred ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
      )}
    </span>
  );
}

/** Labelled text control, for places where one switch drives one or more <BlurImage blurred=…>. */
export function BlurToggle({
  blurred,
  onChange,
  className = "",
}: {
  blurred: boolean;
  onChange: (blurred: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!blurred)}
      aria-pressed={!blurred}
      className={`inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors print:hidden ${className}`}
    >
      {blurred ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      {blurred ? "Unblur" : "Blur"}
    </button>
  );
}
