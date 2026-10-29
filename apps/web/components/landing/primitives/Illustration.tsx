/* eslint-disable @next/next/no-img-element */

type Props = { src: string; width: number; height: number; alt: string };

/**
 * Landing artwork. Uses a plain <img> because these are pre-optimised
 * .webp/.png files in /public/landing and the layout sets width:100%.
 */
export function Illustration({ src, width, height, alt }: Props) {
  return <img className="tv-img" src={src} width={width} height={height} alt={alt} />;
}
