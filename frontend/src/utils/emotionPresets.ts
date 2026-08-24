// Canonical 7-Emotion Sample Presets for Static Image Analysis
import { EmotionType } from '../types';

export interface EmotionPreset {
  id: EmotionType;
  label: string;
  emoji: string;
  color: string;
  description: string;
  valence: number;
  arousal: number;
  svgDataUri: string;
}

// Generate realistic SVG facial emotion expression portraits as clean Data URIs
const createEmotionSvg = (emotion: EmotionType, eyeShape: string, mouthShape: string, eyebrowShape: string, colorHex: string, bgHex: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
    <defs>
      <radialGradient id="faceGlow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#fed7aa" />
        <stop offset="85%" stop-color="#fba86b" />
        <stop offset="100%" stop-color="#e07e3c" />
      </radialGradient>
      <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${bgHex}" />
        <stop offset="100%" stop-color="#090d16" />
      </radialGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.45"/>
      </filter>
    </defs>
    
    <!-- Background Frame -->
    <rect width="300" height="300" fill="url(#bgGrad)" rx="24"/>
    
    <!-- Head Shadow & Base Shape -->
    <ellipse cx="150" cy="155" rx="72" ry="86" fill="url(#faceGlow)" filter="url(#shadow)" stroke="#c26322" stroke-width="2.5"/>
    
    <!-- Hair Base -->
    <path d="M 76 135 C 76 70, 224 70, 224 135 C 210 100, 185 85, 150 85 C 115 85, 90 100, 76 135 Z" fill="#2d1d14"/>
    <path d="M 85 110 Q 150 72 215 110 Q 190 92 150 90 Q 110 92 85 110 Z" fill="#1b120c"/>

    <!-- Eyebrows -->
    ${eyebrowShape}

    <!-- Eyes -->
    ${eyeShape}

    <!-- Nose -->
    <path d="M 148 140 Q 146 158 141 165 Q 150 168 159 165 Q 154 158 152 140" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- Mouth -->
    ${mouthShape}

    <!-- Emotion Badge HUD Indicator -->
    <g transform="translate(15, 255)">
      <rect width="270" height="30" rx="8" fill="#0f172a" fill-opacity="0.85" stroke="${colorHex}" stroke-width="1.5"/>
      <circle cx="16" cy="15" r="5" fill="${colorHex}"/>
      <text x="30" y="20" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" letter-spacing="1">CANONICAL ${emotion.toUpperCase()}</text>
      <text x="255" y="20" fill="${colorHex}" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" text-anchor="end">FER-2013</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const EMOTION_PRESETS: EmotionPreset[] = [
  {
    id: 'happy',
    label: 'Happy',
    emoji: '😊',
    color: '#10b981',
    description: 'High Positive Valence, Uplifted Zygomaticus Major (Smile)',
    valence: 0.85,
    arousal: 0.55,
    svgDataUri: createEmotionSvg(
      'happy',
      `<!-- Happy Eyes (Arched) -->
       <path d="M 108 138 Q 123 124 138 138" fill="none" stroke="#2b1810" stroke-width="4.5" stroke-linecap="round"/>
       <path d="M 162 138 Q 177 124 192 138" fill="none" stroke="#2b1810" stroke-width="4.5" stroke-linecap="round"/>
       <ellipse cx="102" cy="158" rx="8" ry="4" fill="#f43f5e" fill-opacity="0.35"/>
       <ellipse cx="198" cy="158" rx="8" ry="4" fill="#f43f5e" fill-opacity="0.35"/>`,
      `<!-- Happy Smile -->
       <path d="M 115 178 Q 150 216 185 178 Q 150 196 115 178 Z" fill="#b91c1c" stroke="#881337" stroke-width="2.5"/>
       <path d="M 124 182 Q 150 198 176 182" fill="#ffffff"/>`,
      `<!-- Raised Friendly Eyebrows -->
       <path d="M 100 120 Q 122 108 142 122" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>
       <path d="M 158 122 Q 178 108 200 120" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>`,
      '#10b981',
      '#064e3b'
    )
  },
  {
    id: 'sad',
    label: 'Sad',
    emoji: '😢',
    color: '#3b82f6',
    description: 'Low Negative Valence, Drooped Lip Corners & Inner Eyebrow Elevation',
    valence: -0.75,
    arousal: -0.40,
    svgDataUri: createEmotionSvg(
      'sad',
      `<!-- Sad Eyes -->
       <ellipse cx="123" cy="138" rx="10" ry="8" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="123" cy="140" r="5" fill="#2b1810"/>
       <ellipse cx="177" cy="138" rx="10" ry="8" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="177" cy="140" r="5" fill="#2b1810"/>
       <!-- Tear -->
       <path d="M 184 148 C 184 148, 189 160, 189 165 C 189 168, 186 170, 184 170 C 182 170, 179 168, 179 165 C 179 160, 184 148, 184 148 Z" fill="#38bdf8"/>`,
      `<!-- Downturned Sad Mouth -->
       <path d="M 125 194 Q 150 176 175 194" fill="none" stroke="#7f1d1d" stroke-width="4" stroke-linecap="round"/>`,
      `<!-- Inner Eyebrow Rise (Triangulated) -->
       <path d="M 104 116 Q 124 126 142 120" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>
       <path d="M 158 120 Q 176 126 196 116" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>`,
      '#3b82f6',
      '#1e3a8a'
    )
  },
  {
    id: 'angry',
    label: 'Angry',
    emoji: '😠',
    color: '#ef4444',
    description: 'High Negative Valence, Lowered Corrugator Eyebrows & Tense Lips',
    valence: -0.80,
    arousal: 0.85,
    svgDataUri: createEmotionSvg(
      'angry',
      `<!-- Intense Narrowed Eyes -->
       <path d="M 108 136 Q 123 130 138 138 Q 123 146 108 136 Z" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="125" cy="137" r="4.5" fill="#2b1810"/>
       <path d="M 162 138 Q 177 130 192 136 Q 177 146 162 138 Z" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="175" cy="137" r="4.5" fill="#2b1810"/>`,
      `<!-- Bared Tense Mouth -->
       <path d="M 124 186 Q 150 180 176 186 Q 150 196 124 186 Z" fill="#7f1d1d" stroke="#450a0a" stroke-width="3"/>
       <line x1="130" y1="186" x2="170" y2="186" stroke="#ffffff" stroke-width="2"/>`,
      `<!-- Slanted V-Angled Eyebrows -->
       <path d="M 102 118 L 140 132" fill="none" stroke="#372418" stroke-width="5" stroke-linecap="round"/>
       <path d="M 198 118 L 160 132" fill="none" stroke="#372418" stroke-width="5" stroke-linecap="round"/>
       <line x1="148" y1="126" x2="148" y2="136" stroke="#78350f" stroke-width="2"/>
       <line x1="152" y1="126" x2="152" y2="136" stroke="#78350f" stroke-width="2"/>`,
      '#ef4444',
      '#7f1d1d'
    )
  },
  {
    id: 'surprise',
    label: 'Surprise',
    emoji: '😲',
    color: '#f59e0b',
    description: 'High Arousal, Widened Sclera Exposure & Open Jaw',
    valence: 0.40,
    arousal: 0.90,
    svgDataUri: createEmotionSvg(
      'surprise',
      `<!-- Wide Round Eyes -->
       <ellipse cx="123" cy="136" rx="14" ry="14" fill="#ffffff" stroke="#2b1810" stroke-width="2.5"/>
       <circle cx="123" cy="136" r="6" fill="#2b1810"/>
       <circle cx="125" cy="134" r="2" fill="#ffffff"/>
       <ellipse cx="177" cy="136" rx="14" ry="14" fill="#ffffff" stroke="#2b1810" stroke-width="2.5"/>
       <circle cx="177" cy="136" r="6" fill="#2b1810"/>
       <circle cx="179" cy="134" r="2" fill="#ffffff"/>`,
      `<!-- O-Shaped Open Jaw -->
       <ellipse cx="150" cy="188" rx="15" ry="20" fill="#450a0a" stroke="#7f1d1d" stroke-width="3"/>`,
      `<!-- High Arched Eyebrows -->
       <path d="M 102 110 Q 123 94 144 110" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>
       <path d="M 156 110 Q 177 94 198 110" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>`,
      '#f59e0b',
      '#78350f'
    )
  },
  {
    id: 'fear',
    label: 'Fear',
    emoji: '😨',
    color: '#a855f7',
    description: 'High Arousal & Low Valence, Retracted Eyelids and Stretched Lips',
    valence: -0.65,
    arousal: 0.88,
    svgDataUri: createEmotionSvg(
      'fear',
      `<!-- Wide Apprehensive Eyes -->
       <ellipse cx="123" cy="136" rx="13" ry="11" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="123" cy="136" r="5" fill="#2b1810"/>
       <ellipse cx="177" cy="136" rx="13" ry="11" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="177" cy="136" r="5" fill="#2b1810"/>`,
      `<!-- Horizontally Stretched Tense Mouth -->
       <path d="M 120 184 Q 150 178 180 184 Q 150 198 120 184 Z" fill="#581c87" stroke="#3b0764" stroke-width="2.5"/>`,
      `<!-- Straightened Raised Eyebrows -->
       <path d="M 104 114 Q 124 110 142 118" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>
       <path d="M 158 118 Q 176 110 196 114" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>`,
      '#a855f7',
      '#581c87'
    )
  },
  {
    id: 'disgust',
    label: 'Disgust',
    emoji: '🤢',
    color: '#84cc16',
    description: 'Aversive Low Valence, Wrinkled Nasal Bridge and Raised Upper Lip',
    valence: -0.70,
    arousal: 0.35,
    svgDataUri: createEmotionSvg(
      'disgust',
      `<!-- Squinting Narrow Eyes -->
       <path d="M 108 140 Q 123 134 138 140 Q 123 144 108 140 Z" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="124" cy="139" r="4" fill="#2b1810"/>
       <path d="M 162 140 Q 177 134 192 140 Q 177 144 162 140 Z" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="176" cy="139" r="4" fill="#2b1810"/>
       <!-- Nose Wrinkle -->
       <path d="M 142 148 Q 150 144 158 148" fill="none" stroke="#78350f" stroke-width="2"/>
       <path d="M 144 153 Q 150 149 156 153" fill="none" stroke="#78350f" stroke-width="2"/>`,
      `<!-- Asymmetric Raised Upper Lip -->
       <path d="M 125 186 Q 140 174 160 180 Q 175 186 160 190 Q 140 188 125 186 Z" fill="#365314" stroke="#1a2e05" stroke-width="2.5"/>`,
      `<!-- Lowered Furrowed Brow -->
       <path d="M 106 126 Q 124 128 140 134" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>
       <path d="M 160 134 Q 176 128 194 126" fill="none" stroke="#372418" stroke-width="4" stroke-linecap="round"/>`,
      '#84cc16',
      '#365314'
    )
  },
  {
    id: 'neutral',
    label: 'Neutral',
    emoji: '😐',
    color: '#94a3b8',
    description: 'Affective Equilibrium Baseline, Relaxed Facial Musculature',
    valence: 0.00,
    arousal: 0.05,
    svgDataUri: createEmotionSvg(
      'neutral',
      `<!-- Calm Neutral Eyes -->
       <ellipse cx="123" cy="136" rx="10" ry="7" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="123" cy="136" r="4.5" fill="#2b1810"/>
       <ellipse cx="177" cy="136" rx="10" ry="7" fill="#ffffff" stroke="#2b1810" stroke-width="2"/>
       <circle cx="177" cy="136" r="4.5" fill="#2b1810"/>`,
      `<!-- Straight Horizontal Mouth Line -->
       <line x1="130" y1="184" x2="170" y2="184" stroke="#7f1d1d" stroke-width="3.5" stroke-linecap="round"/>`,
      `<!-- Horizontal Relaxed Eyebrows -->
       <path d="M 106 118 Q 124 116 142 120" fill="none" stroke="#372418" stroke-width="3.5" stroke-linecap="round"/>
       <path d="M 158 120 Q 176 116 194 118" fill="none" stroke="#372418" stroke-width="3.5" stroke-linecap="round"/>`,
      '#94a3b8',
      '#1e293b'
    )
  }
];
