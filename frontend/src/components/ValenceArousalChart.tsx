import React from 'react';
import { AffectivePlane, EmotionType } from '../types';

interface ValenceArousalChartProps {
  currentEmotion?: EmotionType;
  currentCoord?: { valence: number; arousal: number };
  sessionPoints?: Array<{ valence: number; arousal: number; emotion: string; label?: string }>;
  height?: number;
}

const EMOTION_COORDS: Record<string, { valence: number; arousal: number; label: string; color: string }> = {
  happy: { valence: 0.75, arousal: 0.6, label: 'Happy / Joy', color: '#10b981' },
  surprise: { valence: 0.4, arousal: 0.8, label: 'Surprise / Alert', color: '#f59e0b' },
  neutral: { valence: 0.0, arousal: 0.0, label: 'Neutral / Calm', color: '#94a3b8' },
  sad: { valence: -0.65, arousal: -0.45, label: 'Sad / Subdued', color: '#3b82f6' },
  fear: { valence: -0.6, arousal: 0.7, label: 'Fear / Anxious', color: '#8b5cf6' },
  angry: { valence: -0.75, arousal: 0.75, label: 'Angry / Frustrated', color: '#ef4444' },
  disgust: { valence: -0.6, arousal: 0.35, label: 'Disgust', color: '#84cc16' }
};

export const ValenceArousalChart: React.FC<ValenceArousalChartProps> = ({
  currentEmotion,
  currentCoord,
  sessionPoints = [],
  height = 280
}) => {
  // Determine active coordinate
  const activeCoord = currentCoord || (currentEmotion ? EMOTION_COORDS[currentEmotion] : EMOTION_COORDS.neutral);

  // Convert -1..1 coordinates to percentage 0%..100%
  const toPctX = (val: number) => ((val + 1) / 2) * 100;
  const toPctY = (arousal: number) => ((1 - arousal) / 2) * 100; // inverted Y for DOM

  return (
    <div className="w-full flex flex-col space-y-2">
      <div
        className="relative w-full rounded-2xl bg-slate-950/80 border border-slate-800/80 overflow-hidden select-none"
        style={{ height }}
      >
        {/* Quadrant Background Tints */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-25">
          <div className="bg-rose-950/30 border-r border-b border-slate-700/40 p-2 flex flex-col justify-start items-start">
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300/70">
              High Tension / Alarm
            </span>
          </div>
          <div className="bg-emerald-950/30 border-b border-slate-700/40 p-2 flex flex-col justify-start items-end text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300/70">
              High Engagement / Joy
            </span>
          </div>
          <div className="bg-sky-950/30 border-r border-slate-700/40 p-2 flex flex-col justify-end items-start">
            <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300/70">
              Low Energy / Sadness
            </span>
          </div>
          <div className="bg-indigo-950/30 p-2 flex flex-col justify-end items-end text-right">
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300/70">
              Relaxed / Contentment
            </span>
          </div>
        </div>

        {/* Center Crosshairs */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-700/60 border-t border-dashed border-slate-600/60 pointer-events-none" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-700/60 border-l border-dashed border-slate-600/60 pointer-events-none" />

        {/* Axis Labels */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-amber-400/90 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          + AROUSAL (High Energy)
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          - AROUSAL (Low Energy)
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400/90 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          - VALENCE (Negative)
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400/90 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          + VALENCE (Positive)
        </div>

        {/* Reference Emotion Anchors */}
        {Object.entries(EMOTION_COORDS).map(([key, item]) => {
          const isCurrent = currentEmotion === key;
          return (
            <div
              key={key}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none flex items-center gap-1.5 ${
                isCurrent ? 'opacity-100 scale-110 z-20' : 'opacity-40 scale-90 z-10'
              }`}
              style={{
                left: `${toPctX(item.valence)}%`,
                top: `${toPctY(item.arousal)}%`
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
              />
              <span
                className="text-[10px] font-semibold capitalize px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-300"
              >
                {key}
              </span>
            </div>
          );
        })}

        {/* Historical Session Scatter Points */}
        {sessionPoints.map((pt, idx) => (
          <div
            key={idx}
            className="absolute w-2 h-2 rounded-full bg-indigo-400/60 border border-indigo-300/80 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${toPctX(pt.valence)}%`,
              top: `${toPctY(pt.arousal)}%`
            }}
            title={pt.label || pt.emotion}
          />
        ))}

        {/* Active Pulse Pointer */}
        {activeCoord && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-300"
            style={{
              left: `${toPctX(activeCoord.valence)}%`,
              top: `${toPctY(activeCoord.arousal)}%`
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-6 h-6 rounded-full bg-indigo-500/40 animate-ping absolute" />
              <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 border-2 border-white shadow-lg shadow-indigo-500/80" />
            </div>
          </div>
        )}
      </div>

      {/* Coordinate Readout Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <div>
          Valence: <span className="font-semibold text-indigo-300">{(activeCoord?.valence ?? 0).toFixed(2)}</span> ({activeCoord?.valence && activeCoord.valence > 0.2 ? 'Positive' : activeCoord?.valence && activeCoord.valence < -0.2 ? 'Negative' : 'Neutral'})
        </div>
        <div>
          Arousal: <span className="font-semibold text-purple-300">{(activeCoord?.arousal ?? 0).toFixed(2)}</span> ({activeCoord?.arousal && activeCoord.arousal > 0.2 ? 'High Energy' : activeCoord?.arousal && activeCoord.arousal < -0.2 ? 'Low Energy' : 'Moderate'})
        </div>
      </div>
    </div>
  );
};
