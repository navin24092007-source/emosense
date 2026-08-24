import React, { useEffect, useRef } from 'react';
import { EmotionPrediction, EmotionType } from '../types';
import { Smile, Frown, Flame, AlertCircle, Zap, Shield, Meh } from 'lucide-react';

interface EmotionOverlayProps {
  prediction: EmotionPrediction | null;
  videoWidth: number;
  videoHeight: number;
}

export const emotionColors: Record<EmotionType, { bg: string; text: string; border: string; bar: string; icon: any }> = {
  happy: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50', bar: 'bg-emerald-500', icon: Smile },
  sad: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', bar: 'bg-blue-500', icon: Frown },
  angry: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50', bar: 'bg-rose-500', icon: Flame },
  surprise: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50', bar: 'bg-amber-500', icon: Zap },
  fear: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', bar: 'bg-purple-500', icon: AlertCircle },
  disgust: { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/50', bar: 'bg-lime-500', icon: Shield },
  neutral: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/50', bar: 'bg-slate-400', icon: Meh }
};

export const EmotionOverlay: React.FC<EmotionOverlayProps> = ({ prediction, videoWidth, videoHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (prediction && prediction.bbox) {
      const [x, y, w, h] = prediction.bbox;
      if (w > 0 && h > 0) {
        const color = emotionColors[prediction.emotion]?.bar || '#6366f1';

        // Draw glowing bounding box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.strokeRect(x, y, w, h);

        // Draw corner accents
        const cornerLen = 14;
        ctx.lineWidth = 5;
        // Top-Left
        ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
        // Top-Right
        ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
        // Bottom-Left
        ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
        // Bottom-Right
        ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();

        // Reset shadow for text
        ctx.shadowBlur = 0;
      }
    }
  }, [prediction, videoWidth, videoHeight]);

  if (!prediction) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="glass-panel px-4 py-2 rounded-xl text-slate-400 text-xs font-medium">
          Awaiting face input...
        </div>
      </div>
    );
  }

  const currentConfig = emotionColors[prediction.emotion] || emotionColors.neutral;
  const EmotionIcon = currentConfig.icon;
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Bounding Box Canvas */}
      <canvas
        ref={canvasRef}
        width={videoWidth || 640}
        height={videoHeight || 480}
        className="w-full h-full absolute inset-0"
      />

      {/* Top Left Live HUD Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-panel border ${currentConfig.border} shadow-xl backdrop-blur-md`}>
          <div className={`p-1.5 rounded-xl ${currentConfig.bg} ${currentConfig.text}`}>
            <EmotionIcon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Detected Emotion</div>
            <div className={`text-lg font-extrabold capitalize ${currentConfig.text}`}>
              {prediction.emotion}
            </div>
          </div>
        </div>

        <div className="glass-panel px-3.5 py-2.5 rounded-2xl border border-slate-700/60 shadow-xl backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Confidence Score</div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full ${currentConfig.bar} transition-all duration-300 rounded-full`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-200">{confidencePercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
