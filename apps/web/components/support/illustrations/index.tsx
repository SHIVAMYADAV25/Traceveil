// /**
//  * Line illustrations in the same language as /illustration.png on the landing page:
//  * thin ink strokes on white, with a few small indigo "pixel" squares as the accent.
//  * Decorative only (aria-hidden); the text next to them carries the meaning.
//  */
// const INK = "#0a0a0a";
// const INDIGO = "#6366f1";
// const SOFT = "#818cf8";

// const common = {
//   viewBox: "24 24 272 180",
//   fill: "none",
//   "aria-hidden": true,
//   className: "h-full w-full",
//   preserveAspectRatio: "xMidYMid meet",
// } as const;

// function Px({ x, y, s = 5, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
//   return <rect x={x} y={y} width={s} height={s} fill={INDIGO} opacity={o} />;
// }

// /** Two people sitting near each other, one speaking, one listening. */
// export function TalkIllustration() {
//   return (
//     <svg {...common}>
//       {/* listener */}
//       <circle cx="108" cy="92" r="25" stroke={INK} strokeWidth="1.5" />
//       <path d="M58 192c0-34 22-56 50-56s50 22 50 56" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
//       <path d="M96 88c4-9 18-9 22 0" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity=".5" />
//       {/* person speaking */}
//       <circle cx="214" cy="100" r="22" stroke={INK} strokeWidth="1.5" />
//       <path d="M170 192c0-30 19-50 44-50s44 20 44 50" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
//       {/* the space between them */}
//       <path d="M92 52c34-30 98-30 134 6" stroke={SOFT} strokeWidth="1.4" strokeDasharray="2 7" strokeLinecap="round" />
//       <path d="M26 192h268" stroke={INK} strokeWidth="1.2" opacity=".25" />
//       <Px x={244} y={64} s={6} /><Px x={256} y={78} s={4} o={0.6} /><Px x={236} y={80} s={3} o={0.45} />
//       <Px x={64} y={74} s={4} o={0.5} />
//     </svg>
//   );
// }

// /** A ring of people, one highlighted. */
// export function CircleIllustration() {
//   const pts = [0, 1, 2, 3, 4, 5].map((i) => {
//     const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
//     return { x: 160 + Math.cos(a) * 78, y: 112 + Math.sin(a) * 66 };
//   });
//   return (
//     <svg {...common}>
//       <ellipse cx="160" cy="112" rx="78" ry="66" stroke={SOFT} strokeWidth="1.3" strokeDasharray="2 7" strokeLinecap="round" />
//       {pts.map((p, i) => (
//         <g key={i}>
//           <circle cx={p.x} cy={p.y - 6} r="9" stroke={INK} strokeWidth="1.5" fill={i === 0 ? INDIGO : "none"} strokeOpacity={i === 0 ? 0 : 1} />
//           <path
//             d={`M${p.x - 15} ${p.y + 20}c0-10 6-17 15-17s15 7 15 17`}
//             stroke={i === 0 ? INDIGO : INK}
//             strokeWidth="1.5"
//             strokeLinecap="round"
//           />
//         </g>
//       ))}
//       <circle cx="160" cy="112" r="3" fill={INK} />
//       <Px x={40} y={40} s={5} o={0.5} /><Px x={52} y={52} s={3} o={0.4} /><Px x={268} y={170} s={5} o={0.6} />
//     </svg>
//   );
// }

// /** An open book with soft sound arcs above it. */
// export function ReadListenIllustration() {
//   return (
//     <svg {...common}>
//       <path d="M62 150l98 18V98L62 80z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
//       <path d="M258 150l-98 18V98l98-18z" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
//       <path d="M160 98v70" stroke={INK} strokeWidth="1.5" />
//       <path d="M80 104l62 11M80 118l62 11M80 132l50 9" stroke={INK} strokeWidth="1.2" opacity=".35" strokeLinecap="round" />
//       <path d="M240 104l-62 11M240 118l-62 11M240 132l-50 9" stroke={INK} strokeWidth="1.2" opacity=".35" strokeLinecap="round" />
//       {[22, 38, 54].map((r, i) => (
//         <path
//           key={r}
//           d={`M${160 - r} 66a${r} ${r} 0 0 1 ${r * 2} 0`}
//           stroke={SOFT}
//           strokeWidth="1.5"
//           strokeLinecap="round"
//           opacity={1 - i * 0.22}
//         />
//       ))}
//       <circle cx="160" cy="70" r="3" fill={INDIGO} />
//       <path d="M40 190h240" stroke={INK} strokeWidth="1.2" opacity=".25" />
//       <Px x={256} y={52} s={5} o={0.6} /><Px x={268} y={64} s={3} o={0.4} /><Px x={50} y={56} s={4} o={0.5} />
//     </svg>
//   );
// }
import React from "react";

/**
 * 1. TalkIllustration (Blue Theme - Counsellor/Therapist)
 * Exact SVG structure maintained with matched dark-slate heads and soft blue gradient fills.
 */
export function TalkIllustration() {
  return (
    <svg
      viewBox="0 0 280 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full max-w-[240px] select-none"
    >
      <defs>
        {/* Head Gradient - Dark Slate / Midnight Blue */}
        <radialGradient id="talkHeadGrad" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>

        {/* Body Gradient - Soft Sky Blue */}
        <linearGradient id="talkBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#BFDBFE" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.0" />
        </linearGradient>

        {/* Primary Speech Bubble Gradient - Bright Periwinkle */}
        <linearGradient id="bubblePrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        {/* Secondary Response Bubble Gradient */}
        <linearGradient id="bubbleSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Person 1: Seeker / Client (Left) */}
      <g id="client">
        <circle cx="82" cy="84" r="21" fill="url(#talkHeadGrad)" />
        <path
          d="M38 165c0-26 20-46 44-46s44 20 44 46"
          fill="url(#talkBodyGrad)"
        />
      </g>

      {/* Person 2: Counsellor (Right) */}
      <g id="counsellor">
        <circle cx="198" cy="84" r="21" fill="url(#talkHeadGrad)" />
        <path
          d="M154 165c0-26 20-46 44-46s44 20 44 46"
          fill="url(#talkBodyGrad)"
        />
      </g>

      {/* Two-Way Conversation Bubbles in the Center */}
      <g id="dialogue">
        {/* Main Speaking Bubble (from Counsellor/Right side) */}
        <g id="primary-bubble">
          <rect
            x="132"
            y="26"
            width="56"
            height="32"
            rx="14"
            fill="url(#bubblePrimary)"
          />
          {/* Bubble Tail pointing toward right figure */}
          <path
            d="M172 58l8 7v-7h-8z"
            fill="url(#bubblePrimary)"
          />
          {/* Active Typing Dots */}
          <circle cx="150" cy="42" r="2.5" fill="#FFFFFF" />
          <circle cx="160" cy="42" r="2.5" fill="#FFFFFF" />
          <circle cx="170" cy="42" r="2.5" fill="#FFFFFF" />
        </g>

        {/* Small Listening/Response Bubble (from Client/Left side) */}
        <g id="response-bubble">
          <rect
            x="92"
            y="48"
            width="32"
            height="22"
            rx="11"
            fill="url(#bubbleSecondary)"
          />
          {/* Bubble Tail pointing toward left figure */}
          <path
            d="M102 70l-5 5v-5h5z"
            fill="url(#bubbleSecondary)"
          />
          <circle cx="103" cy="59" r="1.8" fill="#FFFFFF" />
          <circle cx="112" cy="59" r="1.8" fill="#FFFFFF" />
        </g>
      </g>
    </svg>
  );
}

/**
 * 2. CircleIllustration (Purple Theme - Support Group & Sharing)
 * Matched to Card 2 in the image with dark heads, purple highlighted speaker, and soft lavender bodies.
 */
export function CircleIllustration() {
  const numPoints = 6;
  const cx = 140;
  const cy = 90;
  const rx = 76;
  const ry = 48;

  const participants = Array.from({ length: numPoints }).map((_, i) => {
    const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    const depthFactor = 0.85 + ((y - (cy - ry)) / (ry * 2)) * 0.3;

    return {
      x,
      y,
      scale: depthFactor,
      isHighlighted: i === 0, // Top figure is highlighted purple
    };
  });

  return (
    <svg
      viewBox="0 0 280 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full max-w-[240px] select-none"
    >
      <defs>
        {/* Standard Dark Head Gradient */}
        <radialGradient id="circleHeadDark" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>

        {/* Highlighted Top Head Gradient - Vibrant Purple */}
        <radialGradient id="circleHeadPurple" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </radialGradient>

        {/* Soft Lavender Body Gradient */}
        <linearGradient id="circleBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#E9D5FF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FAF5FF" stopOpacity="0.0" />
        </linearGradient>

        {/* Highlighted Body Gradient */}
        <linearGradient id="circleBodyHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#F3E8FF" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Connecting Ring Line */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        stroke="#C084FC"
        strokeOpacity="0.4"
        strokeWidth="1.2"
        strokeDasharray="4 5"
      />

      {/* Central Ring Point */}
      <circle cx={cx} cy={cy} r="2.5" fill="#A855F7" opacity="0.6" />

      {/* Render Figures */}
      {[...participants]
        .sort((a, b) => a.y - b.y)
        .map((p, i) => {
          const headRadius = 11 * p.scale;
          const bodyWidth = 17 * p.scale;
          const bodyHeight = 22 * p.scale;

          return (
            <g key={i} transform={`translate(${p.x}, ${p.y})`}>
              {/* Shoulders / Body Arc */}
              <path
                d={`M${-bodyWidth} ${bodyHeight}c0-${bodyHeight * 0.75} ${bodyWidth * 0.45}-${bodyHeight} ${bodyWidth}-${bodyHeight}s${bodyWidth} ${bodyHeight * 0.25} ${bodyWidth} ${bodyHeight}`}
                fill={p.isHighlighted ? "url(#circleBodyHighlight)" : "url(#circleBodyGrad)"}
              />

              {/* Head */}
              <circle
                cx="0"
                cy={-headRadius - 2}
                r={headRadius}
                fill={p.isHighlighted ? "url(#circleHeadPurple)" : "url(#circleHeadDark)"}
              />
            </g>
          );
        })}
    </svg>
  );
}
export function ReadListenIllustration(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 280 180"
      width="100%"
      height="100%"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full max-w-[240px] select-none"
      {...props}
    >
      <defs>
        {/* Soft Background Glow */}
        <radialGradient id="readGlow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#EEF2FF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFF7ED" stopOpacity="0" />
        </radialGradient>

        {/* Indigo Gradient for Headphones */}
        <linearGradient id="headphoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>

        {/* Soft Peach / Cream Book Surface */}
        <linearGradient id="bookPeach" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF7ED" />
          <stop offset="100%" stopColor="#FFEDD5" />
        </linearGradient>

        {/* Shading Gradients for Depth */}
        <linearGradient id="blueBookShade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="70%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        <linearGradient id="tealBookShade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="70%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        <linearGradient id="orangeBookShade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C2410C" />
          <stop offset="70%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </defs>

      {/* Ambient Ground Glow */}
      <ellipse cx="140" cy="152" rx="72" ry="10" fill="url(#readGlow)" />

      {/* Headphones Arch */}
      <path
        d="M 84 94 C 84 48 108 28 140 28 C 172 28 196 48 196 94"
        stroke="url(#headphoneGrad)"
        strokeWidth="10"
        strokeLinecap="round"
      />
      {/* Headband Inner Highlight */}
      <path
        d="M 89 92 C 89 52 111 34 140 34 C 169 34 191 52 191 92"
        stroke="#C7D2FE"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
        fill="none"
      />

      {/* Left Ear Cushion / Cup */}
      <rect x="70" y="90" width="15" height="44" rx="6" fill="url(#headphoneGrad)" />
      <rect x="85" y="96" width="3.5" height="32" rx="1.5" fill="#6366F1" />

      {/* Right Ear Cushion / Cup */}
      <rect x="195" y="90" width="15" height="44" rx="6" fill="url(#headphoneGrad)" />
      <rect x="191.5" y="96" width="3.5" height="32" rx="1.5" fill="#6366F1" />

      {/* Books Group */}
      <g transform="translate(14, 10)">
        {/* Blue Book (Left - Tallest) */}
        <rect x="84" y="60" width="24" height="66" rx="2.5" fill="url(#blueBookShade)" />
        <line x1="90" y1="70" x2="102" y2="70" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        <line x1="90" y1="77" x2="102" y2="77" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
        <line x1="90" y1="84" x2="96" y2="84" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />

        {/* Teal/Emerald Book (Middle) */}
        <rect x="110" y="68" width="20" height="58" rx="2.5" fill="url(#tealBookShade)" />
        <line x1="115" y1="77" x2="124" y2="77" stroke="#A7F3D0" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="115" y1="83" x2="124" y2="83" stroke="#A7F3D0" strokeWidth="1.8" strokeLinecap="round" />

        {/* Orange Tilted Book (Right - Perfectly positioned and overlapped like the reference) */}
        <g transform="translate(175, 115) rotate(134)">
          <rect x="0" y="0" width="16" height="48" rx="2.5" fill="url(#orangeBookShade)" />
          <line x1="4.5" y1="36" x2="11.5" y2="36" stroke="#FED7AA" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="4.5" y1="42" x2="11.5" y2="42" stroke="#FED7AA" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}