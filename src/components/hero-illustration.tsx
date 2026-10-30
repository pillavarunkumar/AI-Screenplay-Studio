/**
 * Hero artwork: a screenplay page, clapperboard, storyboard frames, microphone,
 * and a film strip. Pure SVG, so it is sharp at any size and needs no image file.
 */
export function HeroIllustration({ className = "" }: { className?: string }) {
  const mono = '"Courier New", Courier, monospace';

  return (
    <svg
      viewBox="0 0 520 460"
      role="img"
      aria-label="A screenplay page, clapperboard, storyboard frames, and microphone"
      className={className}
    >
      <defs>
        <filter id="hero-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#44403c" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Soft backdrop */}
      <path
        d="M70 90C110 20 250 -10 380 30c110 35 150 130 125 230-25 100-120 170-250 165C130 420 30 350 22 250 18 190 40 140 70 90Z"
        fill="#f2d6a8"
      />
      <circle cx="455" cy="62" r="7" fill="#fff" opacity="0.8" />
      <circle cx="68" cy="330" r="5" fill="#fff" opacity="0.7" />
      <path d="M470 150l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#fff" opacity="0.85" />

      {/* Film strip along the bottom */}
      <g transform="rotate(-3 260 410)" filter="url(#hero-shadow)">
        <rect x="40" y="388" width="440" height="46" rx="6" fill="#1c1917" />
        {Array.from({ length: 19 }, (_, i) => (
          <g key={i}>
            <rect x={50 + i * 23} y="393" width="10" height="7" rx="1.5" fill="#fafaf9" opacity="0.9" />
            <rect x={50 + i * 23} y="422" width="10" height="7" rx="1.5" fill="#fafaf9" opacity="0.9" />
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={62 + i * 108} y="404" width="86" height="14" rx="2" fill={["#c9a24b", "#6f8fb5", "#c4725d", "#6f9a86"][i]} opacity="0.85" />
        ))}
      </g>

      {/* Screenplay page */}
      <g transform="rotate(-5 200 210)" filter="url(#hero-shadow)">
        <rect x="70" y="52" width="240" height="318" rx="8" fill="#fffdf8" stroke="#e7e5e4" />
        <rect x="70" y="52" width="240" height="20" rx="8" fill="#f5f5f4" />
        <circle cx="88" cy="62" r="3.5" fill="#fb7185" />
        <circle cx="101" cy="62" r="3.5" fill="#fbbf24" />
        <circle cx="114" cy="62" r="3.5" fill="#4ade80" />
        <text x="92" y="100" fontFamily={mono} fontSize="11" fontWeight="700" fill="#1c1917">
          INT. LIGHTHOUSE - NIGHT
        </text>
        <rect x="92" y="114" width="186" height="5" rx="2.5" fill="#d6d3d1" />
        <rect x="92" y="126" width="150" height="5" rx="2.5" fill="#d6d3d1" />
        <text x="172" y="160" fontFamily={mono} fontSize="11" fill="#1c1917">
          NORA
        </text>
        <text x="150" y="176" fontFamily={mono} fontSize="10" fill="#78716c">
          (quietly)
        </text>
        <rect x="132" y="186" width="130" height="5" rx="2.5" fill="#a8a29e" />
        <rect x="132" y="198" width="104" height="5" rx="2.5" fill="#a8a29e" />
        <rect x="92" y="224" width="170" height="5" rx="2.5" fill="#d6d3d1" />
        <rect x="92" y="236" width="128" height="5" rx="2.5" fill="#d6d3d1" />
        <text x="172" y="268" fontFamily={mono} fontSize="11" fill="#1c1917">
          THEO
        </text>
        <rect x="132" y="278" width="120" height="5" rx="2.5" fill="#a8a29e" />
        <rect x="132" y="290" width="86" height="5" rx="2.5" fill="#a8a29e" />
        <text x="236" y="332" fontFamily={mono} fontSize="10" fill="#57534e">
          CUT TO:
        </text>
        {/* Writing cursor */}
        <rect x="224" y="288" width="2.5" height="12" fill="#f59e0b" />
      </g>

      {/* Clapperboard */}
      <g transform="rotate(8 395 120)" filter="url(#hero-shadow)">
        <rect x="320" y="92" width="150" height="104" rx="8" fill="#292524" />
        <g transform="rotate(-12 322 90)">
          <rect x="320" y="62" width="150" height="30" rx="5" fill="#fafaf9" />
          {Array.from({ length: 6 }, (_, i) => (
            <path key={i} d={`M${334 + i * 26} 62 l16 0 l-12 30 l-16 0z`} fill="#292524" />
          ))}
        </g>
        <rect x="320" y="92" width="150" height="22" fill="#fafaf9" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${334 + i * 26} 92 l16 0 l-12 22 l-16 0z`} fill="#292524" />
        ))}
        <text x="334" y="142" fontFamily={mono} fontSize="10" fill="#d6d3d1">SCENE  12</text>
        <text x="334" y="160" fontFamily={mono} fontSize="10" fill="#d6d3d1">TAKE   03</text>
        <rect x="334" y="170" width="100" height="4" rx="2" fill="#57534e" />
      </g>

      {/* Storyboard frames */}
      <g transform="rotate(4 400 300)" filter="url(#hero-shadow)">
        <rect x="318" y="226" width="150" height="86" rx="6" fill="#fff" stroke="#1c1917" strokeWidth="2" />
        <rect x="322" y="230" width="142" height="78" rx="3" fill="#334155" />
        <circle cx="440" cy="248" r="8" fill="#fef9c3" />
        <rect x="322" y="282" width="142" height="26" fill="#292524" />
        {/* lighthouse */}
        <path d="M360 282l6-34h12l6 34z" fill="#fafaf9" />
        <rect x="364" y="258" width="16" height="5" fill="#ef4444" />
        <rect x="362" y="240" width="20" height="8" rx="2" fill="#fbbf24" />
        {/* person */}
        <circle cx="412" cy="262" r="6" fill="#fafaf9" />
        <path d="M402 292l3-22q7-4 14 0l3 22z" fill="#fafaf9" />
        <rect x="318" y="226" width="22" height="16" fill="#1c1917" />
        <text x="329" y="238" textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize="11" fontWeight="700" fill="#fff">1</text>
        <path d="M335 304h40M367 300l8 4-8 4" stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* Microphone */}
      <g transform="rotate(-10 92 330)" filter="url(#hero-shadow)">
        <rect x="70" y="262" width="44" height="76" rx="22" fill="#44403c" />
        {[278, 290, 302, 314].map((y) => (
          <path key={y} d={`M76 ${y}h32`} stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" />
        ))}
        <path d="M58 316c0 22 15 38 34 38s34-16 34-38" fill="none" stroke="#44403c" strokeWidth="5" strokeLinecap="round" />
        <path d="M92 354v22M74 378h36" stroke="#44403c" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* Sound waves */}
      <g fill="none" stroke="#d97706" strokeWidth="4" strokeLinecap="round" opacity="0.9">
        <path d="M134 280q12 14 0 32" />
        <path d="M148 268q20 28 0 56" opacity="0.7" />
      </g>
    </svg>
  );
}
