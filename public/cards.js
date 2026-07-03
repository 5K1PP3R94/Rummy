// SVG-Figuren für Bube, Dame, König, Jolly – inline SVG, keine externen Abhängigkeiten

const SUIT_COLOR = { H: '#b03434', D: '#b03434', C: '#2b2621', S: '#2b2621' };
const SUIT_SYMBOL = { H: '♥', D: '♦', C: '♣', S: '♠' };

function svgJack(suit) {
  const col = SUIT_COLOR[suit];
  const sym = SUIT_SYMBOL[suit];
  return `<svg viewBox="0 0 62 88" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
    <!-- Rahmen innen -->
    <rect x="3" y="3" width="56" height="82" rx="5" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.35"/>
    <!-- Eckindex oben links -->
    <text x="5" y="14" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}">J</text>
    <text x="6" y="22" font-family="Georgia,serif" font-size="9" fill="${col}">${sym}</text>
    <!-- Eckindex unten rechts gespiegelt -->
    <text x="57" y="79" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}" text-anchor="end" transform="rotate(180,57,79) translate(-57,-79) translate(57,79)">J</text>
    <text x="56" y="72" font-family="Georgia,serif" font-size="9" fill="${col}" text-anchor="end" transform="rotate(180,56,72) translate(-56,-72) translate(56,72)">${sym}</text>
    <!-- Figur: Bube – junger Ritter mit Federhut -->
    <ellipse cx="31" cy="28" rx="9" ry="10" fill="#f5e6c8" stroke="${col}" stroke-width="0.8"/>
    <!-- Federhut -->
    <path d="M22,24 Q24,16 31,18 Q38,16 40,24" fill="${col}" opacity="0.85"/>
    <path d="M38,20 Q44,14 46,16 Q44,20 40,22" fill="${col === '#b03434' ? '#7a1020' : '#444'}" opacity="0.7"/>
    <!-- Gesicht -->
    <circle cx="28" cy="27" r="1.2" fill="${col}"/>
    <circle cx="34" cy="27" r="1.2" fill="${col}"/>
    <path d="M28,32 Q31,34 34,32" fill="none" stroke="${col}" stroke-width="0.9"/>
    <!-- Körper / Rüstung -->
    <rect x="22" y="38" width="18" height="22" rx="2" fill="${col}" opacity="0.12"/>
    <path d="M22,38 Q31,34 40,38 L40,60 Q31,63 22,60 Z" fill="${col}" opacity="0.18"/>
    <!-- Schwert -->
    <line x1="36" y1="38" x2="42" y2="64" stroke="${col}" stroke-width="1.8" opacity="0.7"/>
    <line x1="38" y1="50" x2="44" y2="52" stroke="${col}" stroke-width="1.2" opacity="0.6"/>
    <!-- Schild -->
    <path d="M19,42 L24,40 L24,54 Q21,56 19,54 Z" fill="${col}" opacity="0.25"/>
    <text x="21" y="51" font-size="7" fill="${col}" opacity="0.8">${sym}</text>
  </svg>`;
}

function svgQueen(suit) {
  const col = SUIT_COLOR[suit];
  const sym = SUIT_SYMBOL[suit];
  return `<svg viewBox="0 0 62 88" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
    <rect x="3" y="3" width="56" height="82" rx="5" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.35"/>
    <text x="5" y="14" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}">D</text>
    <text x="6" y="22" font-family="Georgia,serif" font-size="9" fill="${col}">${sym}</text>
    <text x="57" y="79" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}" text-anchor="end" transform="rotate(180,57,79) translate(-57,-79) translate(57,79)">D</text>
    <text x="56" y="72" font-family="Georgia,serif" font-size="9" fill="${col}" text-anchor="end" transform="rotate(180,56,72) translate(-56,-72) translate(56,72)">${sym}</text>
    <!-- Krone -->
    <path d="M20,20 L22,28 L26,22 L31,26 L36,22 L40,28 L42,20 L42,31 L20,31 Z" fill="${col}" opacity="0.9"/>
    <circle cx="20" cy="20" r="2" fill="${col}"/>
    <circle cx="31" cy="18" r="2" fill="${col}"/>
    <circle cx="42" cy="20" r="2" fill="${col}"/>
    <!-- Kopf -->
    <ellipse cx="31" cy="39" rx="8.5" ry="9" fill="#f5e6c8" stroke="${col}" stroke-width="0.7"/>
    <!-- Haare -->
    <path d="M22.5,38 Q22,30 31,30 Q40,30 39.5,38" fill="${col}" opacity="0.75"/>
    <!-- Gesicht -->
    <circle cx="28" cy="38" r="1.1" fill="${col}"/>
    <circle cx="34" cy="38" r="1.1" fill="${col}"/>
    <path d="M28,43 Q31,45.5 34,43" fill="none" stroke="${col}" stroke-width="0.9"/>
    <!-- Kleid -->
    <path d="M22,48 Q31,44 40,48 L43,70 Q31,73 19,70 Z" fill="${col}" opacity="0.15"/>
    <path d="M23,50 Q31,47 39,50" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.5"/>
    <!-- Zepter -->
    <line x1="40" y1="52" x2="43" y2="68" stroke="${col}" stroke-width="1.6" opacity="0.65"/>
    <circle cx="43" cy="51" r="3" fill="${col}" opacity="0.7"/>
    <text x="41.5" y="53" font-size="5" fill="white" opacity="0.9">${sym}</text>
  </svg>`;
}

function svgKing(suit) {
  const col = SUIT_COLOR[suit];
  const sym = SUIT_SYMBOL[suit];
  return `<svg viewBox="0 0 62 88" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
    <rect x="3" y="3" width="56" height="82" rx="5" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.35"/>
    <text x="5" y="14" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}">K</text>
    <text x="6" y="22" font-family="Georgia,serif" font-size="9" fill="${col}">${sym}</text>
    <text x="57" y="79" font-family="Georgia,serif" font-size="11" font-weight="700" fill="${col}" text-anchor="end" transform="rotate(180,57,79) translate(-57,-79) translate(57,79)">K</text>
    <text x="56" y="72" font-family="Georgia,serif" font-size="9" fill="${col}" text-anchor="end" transform="rotate(180,56,72) translate(-56,-72) translate(56,72)">${sym}</text>
    <!-- Krone (reichhaltig) -->
    <path d="M19,19 L21,29 L26,21 L31,25 L36,21 L41,29 L43,19 L43,32 L19,32 Z" fill="${col}" opacity="0.92"/>
    <path d="M19,32 L43,32" stroke="${col}" stroke-width="1.5" opacity="0.6"/>
    <circle cx="19" cy="19" r="2.2" fill="${col}"/>
    <circle cx="31" cy="17" r="2.2" fill="${col}"/>
    <circle cx="43" cy="19" r="2.2" fill="${col}"/>
    <!-- Kopf / Bart -->
    <ellipse cx="31" cy="41" rx="9" ry="9.5" fill="#f5e6c8" stroke="${col}" stroke-width="0.7"/>
    <path d="M22,46 Q22,54 31,56 Q40,54 40,46" fill="${col}" opacity="0.25"/>
    <!-- Gesicht -->
    <circle cx="27.5" cy="40" r="1.2" fill="${col}"/>
    <circle cx="34.5" cy="40" r="1.2" fill="${col}"/>
    <path d="M27,44.5 Q31,47 35,44.5" fill="none" stroke="${col}" stroke-width="0.9"/>
    <!-- Schnauzbart -->
    <path d="M26,43 Q29,45 31,44 Q33,45 36,43" fill="${col}" opacity="0.45" stroke="${col}" stroke-width="0.5"/>
    <!-- Mantel / Körper -->
    <path d="M20,56 Q31,52 42,56 L44,72 Q31,76 18,72 Z" fill="${col}" opacity="0.14"/>
    <path d="M22,58 Q31,55 40,58" fill="none" stroke="${col}" stroke-width="0.8" opacity="0.5"/>
    <!-- Schwert diagonal -->
    <line x1="38" y1="56" x2="46" y2="72" stroke="${col}" stroke-width="2" opacity="0.65"/>
    <line x1="35" y1="62" x2="49" y2="65" stroke="${col}" stroke-width="1.4" opacity="0.55"/>
    <!-- Orb links -->
    <circle cx="21" cy="64" r="5" fill="${col}" opacity="0.18" stroke="${col}" stroke-width="0.8"/>
    <text x="21" y="67" font-size="7" fill="${col}" text-anchor="middle" opacity="0.85">${sym}</text>
  </svg>`;
}

function svgJoker() {
  return `<svg viewBox="0 0 62 88" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%">
    <defs>
      <linearGradient id="jg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8a5a12"/>
        <stop offset="100%" stop-color="#c49a2a"/>
      </linearGradient>
    </defs>
    <rect x="3" y="3" width="56" height="82" rx="5" fill="none" stroke="#c49a2a" stroke-width="0.8" opacity="0.5"/>
    <text x="5" y="14" font-family="Georgia,serif" font-size="8" font-weight="700" fill="#8a5a12">Jo</text>
    <text x="57" y="79" font-family="Georgia,serif" font-size="8" font-weight="700" fill="#8a5a12" text-anchor="end" transform="rotate(180,57,79) translate(-57,-79) translate(57,79)">Jo</text>
    <!-- Narrenkappe -->
    <path d="M20,32 Q18,20 31,16 Q44,20 42,32 L36,28 Q33,22 31,22 Q29,22 26,28 Z" fill="url(#jg)" opacity="0.9"/>
    <circle cx="20" cy="33" r="3.5" fill="#c49a2a"/>
    <circle cx="42" cy="33" r="3.5" fill="#c49a2a"/>
    <circle cx="31" cy="17" r="3.5" fill="#c49a2a"/>
    <!-- Glöckchen -->
    <circle cx="20" cy="33" r="1.5" fill="#7a4a0a"/>
    <circle cx="42" cy="33" r="1.5" fill="#7a4a0a"/>
    <circle cx="31" cy="17" r="1.5" fill="#7a4a0a"/>
    <!-- Gesicht -->
    <ellipse cx="31" cy="44" rx="10" ry="10.5" fill="#f5e6c8" stroke="#8a5a12" stroke-width="0.8"/>
    <circle cx="27" cy="42" r="1.5" fill="#8a5a12"/>
    <circle cx="35" cy="42" r="1.5" fill="#8a5a12"/>
    <!-- breites Grinsen -->
    <path d="M24,48 Q28,53 31,53 Q34,53 38,48" fill="none" stroke="#8a5a12" stroke-width="1.2"/>
    <path d="M24,48 Q28,53 31,53 Q34,53 38,48" fill="#8a5a12" opacity="0.18"/>
    <!-- Narrenanzug -->
    <path d="M21,54 Q31,50 41,54 L43,70 Q37,67 31,69 Q25,67 19,70 Z" fill="url(#jg)" opacity="0.25"/>
    <path d="M21,54 L31,65 L41,54" fill="none" stroke="#8a5a12" stroke-width="0.8" opacity="0.5"/>
    <!-- Narrenszepter -->
    <line x1="42" y1="55" x2="47" y2="70" stroke="#8a5a12" stroke-width="1.8" opacity="0.7"/>
    <circle cx="47" cy="53" r="4.5" fill="#c49a2a" opacity="0.85"/>
    <path d="M43,52 Q47,48 51,52 Q51,57 47,58 Q43,57 43,52 Z" fill="#8a5a12" opacity="0.6"/>
    <text x="47" y="56" font-size="6" fill="white" text-anchor="middle" opacity="0.9">★</text>
  </svg>`;
}

// Exporte global (kein ES-Modul, vanilla JS)
window.CardArt = { svgJack, svgQueen, svgKing, svgJoker };
