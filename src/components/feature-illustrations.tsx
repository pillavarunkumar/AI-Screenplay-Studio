import type { ReactNode } from "react";

/*
 * One small picture per home-page feature, each showing what the feature does
 * (not an icon). 320x180, pure SVG, no image files.
 */

const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = '"Courier New", Courier, monospace';

function Frame({ bg, label, children }: { bg: string; label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label={label} className="block h-auto w-full">
      <rect width="320" height="180" fill={bg} />
      {children}
    </svg>
  );
}

const Bar = ({ x, y, w, c = "#d6d3d1" }: { x: number; y: number; w: number; c?: string }) => (
  <rect x={x} y={y} width={w} height="6" rx="3" fill={c} />
);

const Arrow = ({ x, y, c = "#d97706" }: { x: number; y: number; c?: string }) => (
  <path d={`M${x} ${y}h22m-7-6 7 6-7 6`} fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
);

const Chip = ({ x, y, w, text, fill, color = "#fff" }: { x: number; y: number; w: number; text: string; fill: string; color?: string }) => (
  <g>
    <rect x={x} y={y} width={w} height="16" rx="8" fill={fill} />
    <text x={x + w / 2} y={y + 11.5} textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="700" fill={color}>
      {text}
    </text>
  </g>
);

/** 1 · Speak, and your rough words come back refined. */
export function VoiceArt() {
  return (
    <Frame bg="#fff7ed" label="A microphone turning spoken words into a refined sentence">
      <rect x="40" y="46" width="34" height="62" rx="17" fill="#44403c" />
      {[60, 70, 80, 90].map((y) => <path key={y} d={`M47 ${y}h20`} stroke="#a8a29e" strokeWidth="2.5" strokeLinecap="round" />)}
      <path d="M32 98c0 20 11 32 25 32s25-12 25-32M57 130v18M44 150h26" fill="none" stroke="#44403c" strokeWidth="4.5" strokeLinecap="round" />
      <g fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round">
        <path d="M92 64q10 18 0 36" />
        <path d="M105 54q16 28 0 56" opacity="0.6" />
      </g>
      <rect x="132" y="30" width="172" height="120" rx="12" fill="#fff" stroke="#e7e5e4" />
      <text x="146" y="52" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#a8a29e">YOU SAID</text>
      <text x="146" y="68" fontFamily={SANS} fontSize="10.5" fontStyle="italic" fill="#a8a29e" textDecoration="line-through">a nurse inherit lighthose</text>
      <path d="M218 82v10m-5-5 5 5 5-5" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="146" y="108" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#16a34a">REFINED</text>
      <text x="146" y="126" fontFamily={MONO} fontSize="11.5" fontWeight="700" fill="#1c1917">A nurse inherits</text>
      <text x="146" y="141" fontFamily={MONO} fontSize="11.5" fontWeight="700" fill="#1c1917">a lighthouse.</text>
      <circle cx="288" cy="132" r="9" fill="#22c55e" />
      <path d="m283.5 132 3 3 6-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** 2 · One shared memory of tone, cast, and facts. */
export function BibleArt() {
  return (
    <Frame bg="#eff6ff" label="An open story notebook listing tone, characters, and facts">
      <path d="M160 34q-48-14-120 0v104q72-14 120 0z" fill="#fff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M160 34q48-14 120 0v104q-72-14-120 0z" fill="#fff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M160 34v104" stroke="#93c5fd" strokeWidth="2" />
      <Chip x={58} y={54} w={52} text="TONE" fill="#3b82f6" />
      <text x="58" y="86" fontFamily={SANS} fontSize="11" fontWeight="600" fill="#1e3a8a">Wintry,</text>
      <text x="58" y="100" fontFamily={SANS} fontSize="11" fontWeight="600" fill="#1e3a8a">restrained</text>
      <Chip x={58} y={108} w={52} text="CAST" fill="#6366f1" />
      <circle cx="68" cy="138" r="8" fill="#fb923c" /><text x="68" y="141.5" textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#fff">N</text>
      <circle cx="88" cy="138" r="8" fill="#38bdf8" /><text x="88" y="141.5" textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#fff">T</text>
      <Chip x={178} y={54} w={58} text="FACTS" fill="#0ea5e9" />
      {[78, 96, 114].map((y, i) => (
        <g key={y}>
          <circle cx="184" cy={y + 3} r="3" fill="#0ea5e9" />
          <Bar x={193} y={y} w={[78, 64, 70][i]} c="#bfdbfe" />
        </g>
      ))}
      <rect x="84" y="152" width="152" height="20" rx="10" fill="#1e3a8a" />
      <text x="160" y="166" textAnchor="middle" fontFamily={SANS} fontSize="9.5" fontWeight="700" fill="#fff">used in every AI request</text>
    </Frame>
  );
}

/** 3 · Next-line ideas, each naming its craft technique. */
export function CoachArt() {
  const cards = [
    { y: 22, tag: "SUBTEXT", c: "#8b5cf6", line: "I'm not staying." },
    { y: 66, tag: "ESCALATION", c: "#ef4444", line: "You knew all along." },
    { y: 110, tag: "SHOW, DON'T TELL", c: "#0ea5e9", line: "She hides the letter." },
  ];
  return (
    <Frame bg="#f0fdf4" label="A screenplay scene with three next-line suggestions, each labelled with a technique">
      <rect x="16" y="22" width="112" height="136" rx="8" fill="#fff" stroke="#e7e5e4" />
      <text x="28" y="42" fontFamily={MONO} fontSize="8" fontWeight="700" fill="#1c1917">INT. KITCHEN</text>
      <Bar x={28} y={52} w={84} /><Bar x={28} y={63} w={64} />
      <text x="58" y="88" fontFamily={MONO} fontSize="9" fill="#1c1917">NORA</text>
      <Bar x={40} y={96} w={70} c="#a8a29e" /><Bar x={40} y={107} w={48} c="#a8a29e" />
      <rect x="40" y="120" width="2.5" height="11" fill="#f59e0b" />
      <text x="46" y="148" fontFamily={SANS} fontSize="8.5" fill="#a8a29e">next line?</text>
      <Arrow x={134} y={90} />
      {cards.map((card, i) => (
        <g key={card.tag}>
          <rect x="164" y={card.y} width="140" height="38" rx="9" fill="#fff" stroke={i === 0 ? "#22c55e" : "#e7e5e4"} strokeWidth={i === 0 ? 2 : 1} />
          <rect x="172" y={card.y + 7} width={card.tag.length * 5.6 + 12} height="13" rx="6.5" fill={card.c} />
          <text x={172 + (card.tag.length * 5.6 + 12) / 2} y={card.y + 16.5} textAnchor="middle" fontFamily={SANS} fontSize="7.5" fontWeight="700" fill="#fff">{card.tag}</text>
          <text x="172" y={card.y + 32} fontFamily={MONO} fontSize="9" fill="#44403c">“{card.line}”</text>
        </g>
      ))}
    </Frame>
  );
}

/** 4 · See the rewrite beside the original, then accept. */
export function PolishArt() {
  return (
    <Frame bg="#faf5ff" label="A messy scene on the left and a polished rewrite on the right with an Accept button">
      <rect x="14" y="20" width="132" height="116" rx="10" fill="#fff" stroke="#fecaca" />
      <Chip x={24} y={30} w={52} text="BEFORE" fill="#ef4444" />
      {[58, 72, 86, 100, 114].map((y, i) => (
        <g key={y}>
          <Bar x={26} y={y} w={[104, 90, 100, 70, 84][i]} c="#e7e5e4" />
        </g>
      ))}
      <path d="M26 61h104M26 89h100" stroke="#ef4444" strokeWidth="2" opacity="0.8" />
      <rect x="174" y="20" width="132" height="116" rx="10" fill="#fff" stroke="#bbf7d0" strokeWidth="2" />
      <Chip x={184} y={30} w={48} text="AFTER" fill="#16a34a" />
      {[58, 72, 86, 100].map((y, i) => <Bar key={y} x={186} y={y} w={[92, 78, 86, 54][i]} c="#a7f3d0" />)}
      <circle cx="286" cy="38" r="9" fill="#22c55e" />
      <path d="m281.5 38 3 3 6-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="78" r="12" fill="#8b5cf6" />
      <path d="M154 78h12m-5-5 5 5-5 5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="196" y="146" width="92" height="26" rx="13" fill="#16a34a" />
      <text x="242" y="163" textAnchor="middle" fontFamily={SANS} fontSize="11" fontWeight="700" fill="#fff">Accept ✓</text>
      <rect x="32" y="146" width="92" height="26" rx="13" fill="#fff" stroke="#d6d3d1" />
      <text x="78" y="163" textAnchor="middle" fontFamily={SANS} fontSize="11" fontWeight="600" fill="#57534e">Keep mine</text>
    </Frame>
  );
}

/** 5 · A shot-by-shot plan for each scene. */
export function ShotsArt() {
  const rows = [
    { shot: "WIDE", angle: "eye level", move: "static", c: "#0ea5e9" },
    { shot: "CLOSE-UP", angle: "low angle", move: "push in", c: "#f59e0b" },
    { shot: "OVER SHOULDER", angle: "eye level", move: "pan right", c: "#8b5cf6" },
  ];
  return (
    <Frame bg="#fefce8" label="A camera plan table with shot size, camera angle, and movement for each shot">
      <rect x="16" y="18" width="288" height="144" rx="10" fill="#fff" stroke="#fde68a" />
      <rect x="16" y="18" width="288" height="26" rx="10" fill="#fef3c7" />
      {["#", "SHOT", "ANGLE", "MOVE"].map((h, i) => (
        <text key={h} x={[30, 78, 176, 246][i]} y="35" fontFamily={SANS} fontSize="8.5" fontWeight="700" fill="#92400e">{h}</text>
      ))}
      {rows.map((row, i) => {
        const y = 52 + i * 36;
        return (
          <g key={row.shot}>
            <circle cx="34" cy={y + 14} r="9" fill="#1c1917" />
            <text x="34" y={y + 17.5} textAnchor="middle" fontFamily={SANS} fontSize="10" fontWeight="700" fill="#fff">{i + 1}</text>
            <rect x="52" y={y} width="20" height="28" rx="3" fill={row.c} opacity="0.2" />
            <rect x="56" y={y + 8} width="12" height="12" rx="2" fill={row.c} />
            <text x="78" y={y + 18} fontFamily={SANS} fontSize="10" fontWeight="700" fill="#1c1917">{row.shot}</text>
            <text x="176" y={y + 18} fontFamily={SANS} fontSize="10" fill="#57534e">{row.angle}</text>
            <text x="246" y={y + 18} fontFamily={SANS} fontSize="10" fill="#57534e">{row.move}</text>
            {i < 2 ? <path d={`M26 ${y + 32}h268`} stroke="#fef3c7" /> : null}
          </g>
        );
      })}
    </Frame>
  );
}

/** 6 · Each scene drawn as numbered frames with camera moves. */
export function BoardArt() {
  const frames = [
    { x: 16, sky: "#334155" },
    { x: 116, sky: "#475569" },
    { x: 216, sky: "#1e293b" },
  ];
  return (
    <Frame bg="#fff1f2" label="Three storyboard frames of a lighthouse scene with camera movement arrows">
      {frames.map((f, i) => (
        <g key={f.x}>
          <rect x={f.x} y="26" width="88" height="62" rx="4" fill="#fff" stroke="#1c1917" strokeWidth="2" />
          <rect x={f.x + 3} y="29" width="82" height="56" rx="2" fill={f.sky} />
          <rect x={f.x + 3} y="67" width="82" height="18" fill="#292524" />
          <rect x={f.x} y="26" width="14" height="13" fill="#1c1917" />
          <text x={f.x + 7} y="36" textAnchor="middle" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#fff">{i + 1}</text>
          {i === 0 ? (
            <>
              <circle cx={f.x + 72} cy="44" r="5" fill="#fef9c3" />
              <path d={`M${f.x + 26} 67l5-26h10l5 26z`} fill="#fafaf9" /><rect x={f.x + 29} y="36" width="14" height="6" rx="1.5" fill="#fbbf24" />
              <path d={`M${f.x + 46} 78h26m-6-4 6 4-6 4`} stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          ) : null}
          {i === 1 ? (
            <>
              <circle cx={f.x + 44} cy="54" r="14" fill="#fafaf9" />
              <circle cx={f.x + 39} cy="52" r="1.8" fill="#1c1917" /><circle cx={f.x + 49} cy="52" r="1.8" fill="#1c1917" />
              <path d={`M${f.x + 38} 59q6 4 12 0`} stroke="#1c1917" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <path d={`M${f.x + 8} 34l8 8m56-8-8 8M${f.x + 8} 80l8-8m56 8-8-8`} stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
            </>
          ) : null}
          {i === 2 ? (
            <>
              <circle cx={f.x + 26} cy="58" r="9" fill="#fafaf9" /><path d={`M${f.x + 14} 85l3-18q9-5 18 0l3 18z`} fill="#fafaf9" />
              <circle cx={f.x + 62} cy="50" r="5" fill="#a8a29e" /><path d={`M${f.x + 54} 71l2-12q6-3 12 0l2 12z`} fill="#a8a29e" />
            </>
          ) : null}
          <Bar x={f.x} y={98} w={80} c="#fecdd3" />
          <Bar x={f.x} y={110} w={56} c="#fecdd3" />
        </g>
      ))}
      <rect x="70" y="138" width="180" height="26" rx="13" fill="#e11d48" />
      <text x="160" y="155" textAnchor="middle" fontFamily={SANS} fontSize="10" fontWeight="700" fill="#fff">Print as a storyboard PDF</text>
    </Frame>
  );
}

/** 7 · The same script in any language. */
export function TranslateArt() {
  const langs = [
    { y: 30, text: "తెలుగు", sub: "Telugu", c: "#f97316" },
    { y: 78, text: "हिन्दी", sub: "Hindi", c: "#ef4444" },
    { y: 126, text: "Español", sub: "Spanish", c: "#0ea5e9" },
  ];
  return (
    <Frame bg="#ecfeff" label="A script page in English translated into Telugu, Hindi, and Spanish">
      <rect x="16" y="26" width="104" height="128" rx="10" fill="#fff" stroke="#a5f3fc" />
      <Chip x={26} y={36} w={30} text="EN" fill="#0891b2" />
      <text x="26" y="72" fontFamily={MONO} fontSize="9" fontWeight="700" fill="#1c1917">NORA</text>
      <text x="26" y="88" fontFamily={MONO} fontSize="9" fill="#44403c">Who left these</text>
      <text x="26" y="100" fontFamily={MONO} fontSize="9" fill="#44403c">letters here?</text>
      <Bar x={26} y={116} w={72} /><Bar x={26} y={128} w={50} />
      <circle cx="150" cy="90" r="17" fill="#06b6d4" />
      <circle cx="150" cy="90" r="11" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M139 90h22M150 79c-6 6-6 16 0 22M150 79c6 6 6 16 0 22" fill="none" stroke="#fff" strokeWidth="1.6" />
      {langs.map((l) => (
        <g key={l.sub}>
          <rect x="186" y={l.y} width="120" height="40" rx="9" fill="#fff" stroke="#e7e5e4" />
          <rect x="186" y={l.y} width="6" height="40" rx="3" fill={l.c} />
          <text x="202" y={l.y + 20} fontFamily={SANS} fontSize="14" fontWeight="700" fill="#1c1917">{l.text}</text>
          <text x="202" y={l.y + 33} fontFamily={SANS} fontSize="8.5" fill="#78716c">{l.sub}</text>
        </g>
      ))}
      <path d="M172 90h8m-3-4 3 4-3 4" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** 8 · Autosaved, on every device, with progress. */
export function SavedArt() {
  return (
    <Frame bg="#f5f5f4" label="A laptop and a phone both showing the same story, synced through the cloud, with a progress bar">
      <path d="M118 52c-14 0-22-8-22-18s9-17 20-16c3-9 12-14 22-12 12 2 18 10 18 16 10 0 18 6 18 14s-7 16-18 16z" fill="#fff" stroke="#d6d3d1" strokeWidth="1.5" transform="translate(14 -6)" />
      <circle cx="160" cy="38" r="11" fill="#22c55e" />
      <path d="m154.5 38 4 4 7.5-8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M130 60 94 96M190 60l40 38" stroke="#a8a29e" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="40" y="92" width="130" height="72" rx="7" fill="#1c1917" />
      <rect x="46" y="98" width="118" height="60" rx="3" fill="#fff" />
      <text x="54" y="112" fontFamily={SANS} fontSize="8" fontWeight="700" fill="#1c1917">The Lighthouse Letters</text>
      <Bar x={54} y={120} w={84} /><Bar x={54} y={131} w={62} />
      <rect x="54" y="144" width="96" height="6" rx="3" fill="#e7e5e4" /><rect x="54" y="144" width="62" height="6" rx="3" fill="#22c55e" />
      <path d="M30 168h150l-8-4H38z" fill="#44403c" />
      <rect x="212" y="84" width="56" height="86" rx="10" fill="#1c1917" />
      <rect x="217" y="92" width="46" height="70" rx="5" fill="#fff" />
      <text x="222" y="106" fontFamily={SANS} fontSize="6.5" fontWeight="700" fill="#1c1917">My story</text>
      <Bar x={222} y={112} w={32} /><Bar x={222} y={122} w={24} />
      <rect x="222" y="140" width="36" height="5" rx="2.5" fill="#e7e5e4" /><rect x="222" y="140" width="23" height="5" rx="2.5" fill="#22c55e" />
      <rect x="236" y="30" width="68" height="22" rx="11" fill="#16a34a" />
      <text x="270" y="45" textAnchor="middle" fontFamily={SANS} fontSize="10" fontWeight="700" fill="#fff">Autosaved</text>
      <text x="280" y="120" fontFamily={SANS} fontSize="9" fontWeight="700" fill="#16a34a">62%</text>
    </Frame>
  );
}

export const FEATURE_ART = [VoiceArt, BibleArt, CoachArt, PolishArt, ShotsArt, BoardArt, TranslateArt, SavedArt] as const;
