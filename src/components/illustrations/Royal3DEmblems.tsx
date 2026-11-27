import React from 'react';

interface EmblemProps {
  className?: string;
}

/**
 * 00. ROYAL ASTROLABE & CROWN PRISM — Exclusive Centerpiece Emblem for Topic Master
 * Bespoke luxury 3D architectural gold-and-sapphire gyroscope (zero cartoon look)
 */
export const RoyalAstrolabe3DEmblem: React.FC<EmblemProps> = ({ className = 'w-56 h-56' }) => (
  <svg viewBox="0 0 260 260" fill="none" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="okzCoreGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.92" />
        <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.45" />
        <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="okzGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF9C3" />
        <stop offset="35%" stopColor="#F59E0B" />
        <stop offset="70%" stopColor="#B45309" />
        <stop offset="100%" stopColor="#FDE047" />
      </linearGradient>
      <linearGradient id="okzSapphire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38BDF8" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#4C1D95" />
      </linearGradient>
      <linearGradient id="okzGlassFacet" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
        <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.08" />
      </linearGradient>
    </defs>

    {/* Luminous Halo */}
    <circle cx="130" cy="130" r="108" fill="url(#okzCoreGlow)" />

    {/* Outer Celestial Compass Ring */}
    <g className="origin-center animate-[spin_42s_linear_infinite]">
      <circle
        cx="130"
        cy="130"
        r="104"
        stroke="url(#okzGoldRing)"
        strokeWidth="2"
        strokeDasharray="6 8"
        opacity="0.82"
      />
      <circle cx="130" cy="26" r="4.5" fill="#FEF08A" />
      <circle cx="234" cy="130" r="3.5" fill="#38BDF8" />
      <circle cx="130" cy="234" r="4" fill="#F59E0B" />
      <circle cx="26" cy="130" r="3.5" fill="#C084FC" />
    </g>

    {/* Tilted 3D Orbital Astrolabe Ellipses */}
    <ellipse
      cx="130"
      cy="130"
      rx="92"
      ry="36"
      transform="rotate(-24 130 130)"
      stroke="url(#okzGoldRing)"
      strokeWidth="2.4"
      opacity="0.9"
    />
    <ellipse
      cx="130"
      cy="130"
      rx="92"
      ry="36"
      transform="rotate(28 130 130)"
      stroke="#38BDF8"
      strokeWidth="1.6"
      opacity="0.65"
    />

    {/* Floating Architectural Octahedron Prism Core */}
    <g>
      {/* Back crystal glow */}
      <polygon
        points="130,52 184,130 130,208 76,130"
        fill="url(#okzSapphire)"
        stroke="url(#okzGoldRing)"
        strokeWidth="2.5"
      />
      {/* Upper-left illuminated glass facet */}
      <polygon points="130,52 130,130 76,130" fill="url(#okzGlassFacet)" />
      {/* Upper-right warm gold facet */}
      <polygon
        points="130,52 184,130 130,130"
        fill="#F59E0B"
        opacity="0.35"
      />
      {/* Lower-right deep shadow facet */}
      <polygon
        points="130,130 184,130 130,208"
        fill="#1E1B4B"
        opacity="0.52"
      />
    </g>

    {/* Imperial Gold Crown Floating Inside the Prism */}
    <g transform="translate(98, 102)">
      <path
        d="M8 42L14 14L32 28L50 14L56 42H8Z"
        fill="url(#okzGoldRing)"
        stroke="#FFFBEB"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="9" y="44" width="46" height="6" rx="3" fill="url(#okzGoldRing)" />
      <circle cx="14" cy="11" r="3" fill="#FEF08A" />
      <circle cx="32" cy="7" r="3.8" fill="#FFFBEB" />
      <circle cx="50" cy="11" r="3" fill="#FEF08A" />
    </g>

    {/* Orbiting Data Satellites */}
    <circle cx="208" cy="86" r="5" fill="#FDE047" />
    <circle cx="52" cy="176" r="4.5" fill="#34D399" />
    <circle cx="196" cy="184" r="4" fill="#A78BFA" />
  </svg>
);

/**
 * 01. MOCK TEST — 3D Crystalline Arena Portal Emblem
 */
export const ArenaCrystal3DEmblem: React.FC<EmblemProps> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 140 140" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="arenaPrism" x1="0" y1="0" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="50%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="arenaGold" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    {/* Floating Isometric Pedestal */}
    <ellipse cx="70" cy="116" rx="42" ry="11" fill="#8B5CF6" opacity="0.24" />
    <polygon
      points="70,16 116,44 116,96 70,124 24,96 24,44"
      fill="url(#arenaPrism)"
      fillOpacity="0.22"
      stroke="url(#arenaPrism)"
      strokeWidth="2.4"
    />
    <polygon
      points="70,26 106,48 106,92 70,114 34,92 34,48"
      fill="url(#arenaPrism)"
      fillOpacity="0.88"
    />
    <polygon points="70,26 106,48 70,70 34,48" fill="#FFFFFF" opacity="0.28" />
    {/* Sculpted Play / Arena Crest */}
    <path
      d="M58 52L90 70L58 88V52Z"
      fill="#FFFBEB"
      stroke="url(#arenaGold)"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="110" cy="30" r="4" fill="#FDE047" />
  </svg>
);

/**
 * 02. QUESTION BANK — 3D Sapphire Archive Monolith
 */
export const ArchiveMonolith3DEmblem: React.FC<EmblemProps> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 140 140" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="qbGlass" x1="15" y1="15" x2="125" y2="125" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#67E8F9" />
        <stop offset="55%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#1D4ED8" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="118" rx="44" ry="10" fill="#0EA5E9" opacity="0.26" />
    {/* Three Floating Isometric Crystal Slabs (Stacked Archive) */}
    <polygon points="70,72 114,92 70,112 26,92" fill="#0284C7" opacity="0.65" stroke="#BAE6FD" strokeWidth="1.5" />
    <polygon points="70,50 114,70 70,90 26,70" fill="url(#qbGlass)" opacity="0.82" stroke="#E0F2FE" strokeWidth="1.6" />
    <polygon points="70,26 114,46 70,66 26,46" fill="url(#qbGlass)" stroke="#FFFFFF" strokeWidth="2" />
    <polygon points="70,26 114,46 70,54 26,46" fill="#FFFFFF" opacity="0.34" />
    {/* Glowing Golden Bookmark Key */}
    <circle cx="70" cy="46" r="8" fill="#FEF08A" />
    <circle cx="70" cy="46" r="4" fill="#0284C7" />
  </svg>
);

/**
 * 03. STUDY MATERIALS — 3D Emerald Conservatory Lotus Crystal
 */
export const ConservatoryTome3DEmblem: React.FC<EmblemProps> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 140 140" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="smEmerald" x1="20" y1="20" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="50%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="116" rx="40" ry="10" fill="#10B981" opacity="0.25" />
    {/* Open 3D Floating Crystal Tome Wings */}
    <path
      d="M70 42C52 34 32 38 22 48V98C34 88 52 86 70 96V42Z"
      fill="url(#smEmerald)"
      stroke="#D1FAE5"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path
      d="M70 42C88 34 108 38 118 48V98C106 88 88 86 70 96V42Z"
      fill="#059669"
      stroke="#A7F3D0"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Floating Golden Luminescent Lotus Diamond above book */}
    <polygon points="70,16 82,30 70,42 58,30" fill="#FEF08A" stroke="#FFFBEB" strokeWidth="1.5" />
  </svg>
);

/**
 * 04. BCS UPDATES — 3D Golden Imperial Lighthouse Beacon
 */
export const LighthouseBeacon3DEmblem: React.FC<EmblemProps> = ({ className = 'w-24 h-24' }) => (
  <svg viewBox="0 0 140 140" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="upAmber" x1="24" y1="18" x2="116" y2="118" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FDE047" />
        <stop offset="50%" stopColor="#F97316" />
        <stop offset="100%" stopColor="#E11D48" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="116" rx="38" ry="10" fill="#F97316" opacity="0.25" />
    {/* Expanding Golden Signal Rings */}
    <circle cx="70" cy="54" r="36" stroke="#FDBA74" strokeWidth="1.6" strokeDasharray="5 6" opacity="0.65" />
    <circle cx="70" cy="54" r="24" stroke="#FDE047" strokeWidth="2" opacity="0.85" />
    {/* Sculpted 3D Beacon Spire */}
    <polygon points="70,26 88,54 78,108 62,108 52,54" fill="url(#upAmber)" stroke="#FFF7ED" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="70" cy="54" r="9" fill="#FFFBEB" />
  </svg>
);

/**
 * 05. COUNTDOWN FLIP CARD — 3D Celestial Golden Sundial Emblem
 */
export const ChronoSundial3DEmblem: React.FC<EmblemProps> = ({ className = 'w-24 h-20' }) => (
  <svg viewBox="0 0 140 110" fill="none" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="sundialGold" x1="20" y1="10" x2="120" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="64" rx="48" ry="20" stroke="url(#sundialGold)" strokeWidth="2.5" fill="#1E1B4B" fillOpacity="0.45" />
    <ellipse cx="70" cy="56" rx="38" ry="15" stroke="#FEF08A" strokeWidth="1.6" strokeDasharray="4 6" />
    <polygon points="70,14 82,56 70,66 58,56" fill="url(#sundialGold)" stroke="#FFFBEB" strokeWidth="1.6" />
    <circle cx="70" cy="14" r="4.5" fill="#FEF08A" />
  </svg>
);
