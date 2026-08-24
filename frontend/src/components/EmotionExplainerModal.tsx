import React from 'react';
import { EmotionExplanation, SessionContext, EmotionType } from '../types';
import { emotionColors } from './EmotionOverlay';
import { Sparkles, X, BrainCircuit, Activity, CheckCircle2, ShieldCheck, ArrowUpRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface EmotionExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  explanation: EmotionExplanation | null;
  loading?: boolean;
}

export const EmotionExplainerModal: React.FC<EmotionExplainerModalProps> = ({
  isOpen,
  onClose,
  explanation,
  loading = false
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const emo = explanation?.emotion || 'neutral';
  const config = emotionColors[emo] || emotionColors.neutral;

  const handleCopy = () => {
    if (!explanation) return;
    const text = `EmoSense AI Emotion Diagnostic Summary:\n` +
      `Emotion: ${explanation.emotion.toUpperCase()} (${explanation.confidence}% confidence)\n` +
      `Context: ${explanation.context}\n` +
      `Summary: ${explanation.summary}\n` +
      `Domain Insight: ${explanation.domainInsight}\n` +
      `Affective Plane: ${explanation.affectivePlane.valenceLabel} / ${explanation.affectivePlane.arousalLabel}\n` +
      `Recommendations:\n` +
      explanation.recommendations.map(r => `• ${r}`).join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Emotion Diagnostic Explainer</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Affective Model
                </span>
              </div>
              <p className="text-xs text-slate-400">Natural-language affective telemetry interpretation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Explainer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <BrainCircuit className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Generating comprehensive affective diagnosis & facial action unit analysis...
              </p>
            </div>
          ) : explanation ? (
            <>
              {/* Primary State Banner */}
              <div className={`p-4 rounded-2xl border ${config.border} ${config.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="flex items-center gap-3.5">
                  <div className={`p-3 rounded-2xl bg-slate-900/90 ${config.text} border border-slate-800 shadow-md`}>
                    <config.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Primary Facial Affect
                    </div>
                    <div className={`text-xl font-extrabold capitalize ${config.text}`}>
                      {explanation.emotion}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confidence</div>
                    <div className="text-xl font-extrabold text-white">{explanation.confidence}%</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-indigo-300 font-semibold uppercase">
                    {explanation.context} Context
                  </div>
                </div>
              </div>

              {/* Affective Plane (Russell's Circumplex Model) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Affective Valence</div>
                  <div className="text-sm font-bold text-emerald-400">{explanation.affectivePlane.valenceLabel}</div>
                  <div className="text-[11px] text-slate-500">Valence Score: {explanation.affectivePlane.valence.toFixed(2)}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Arousal / Energy Level</div>
                  <div className="text-sm font-bold text-purple-400">{explanation.affectivePlane.arousalLabel}</div>
                  <div className="text-[11px] text-slate-500">Arousal Score: {explanation.affectivePlane.arousal.toFixed(2)}</div>
                </div>
              </div>

              {/* Domain Specific Insights */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Domain-Specific Diagnostic Assessment ({explanation.context.toUpperCase()})
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  {explanation.domainInsight}
                </p>
              </div>

              {/* Observed Facial Action Units (FAU) */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Observed Facial Muscle Action Units (FAU)
                </h4>
                <div className="space-y-2">
                  {explanation.facialCues.map((cue, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{cue}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Actionable AI Guidance & Next Steps
                </h4>
                <ul className="space-y-2">
                  {explanation.recommendations.map((rec, idx) => (
                    <li key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600/30 text-indigo-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs italic">
              No explanation payload available.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleCopy}
            disabled={!explanation}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Diagnostic Report
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            Close Explainer
          </button>
        </div>
      </div>
    </div>
  );
};
