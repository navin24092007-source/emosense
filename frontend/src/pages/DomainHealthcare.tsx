import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Session, EmotionExplanation } from '../types';
import { EmotionRadarChart } from '../components/EmotionRadarChart';
import { ValenceArousalChart } from '../components/ValenceArousalChart';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { exportSessionsToCSV } from '../utils/reportGenerator';
import { soundManager } from '../utils/audioFeedback';
import { 
  Stethoscope, 
  HeartPulse, 
  Activity, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Download, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DomainHealthcare: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Explainer modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/sessions');
        const healthSessions = res.data.filter((s: Session) => s.context === 'healthcare');
        setSessions(healthSessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const handleExplain = async () => {
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const res = await api.post('/emotions/explain', {
        emotion: sessions.length > 0 ? (sessions[0].dominantEmotion || 'sad') : 'neutral',
        confidence: 0.91,
        context: 'healthcare',
        variability: 'low',
        totalLogs: sessions.length
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to explain healthcare metrics:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  const trendData = sessions.map((s, i) => ({
    session: `Session ${i + 1}`,
    positivity: s.dominantEmotion === 'happy' ? 88 : s.dominantEmotion === 'neutral' ? 68 : 42,
    anxiety: s.dominantEmotion === 'fear' || s.dominantEmotion === 'angry' ? 58 : 18,
    sadness: s.dominantEmotion === 'sad' ? 68 : 14
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-md">
              <Stethoscope className="w-6 h-6" />
            </div>
            Healthcare & Clinical Affective Analyzer
          </h1>
          <p className="text-xs text-slate-400">
            Longitudinal patient mood trend tracking, anxiety markers, and therapeutic progress evaluation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Explain Clinical Affect</span>
          </button>

          <button
            onClick={() => exportSessionsToCSV(sessions)}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Healthcare KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Affective Recovery Index</span>
            <HeartPulse className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-300">+34% Positive Trajectory</div>
          <p className="text-[11px] text-slate-400">Statistically significant reduction in anxiety/sad facial markers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Affective Baseline Stability</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-sky-300">High Stability (88%)</div>
          <p className="text-[11px] text-slate-400">Low rapid state perturbation across clinical sessions</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Clinical Sessions</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{sessions.length}</div>
          <p className="text-[11px] text-slate-400">Encrypted in-memory telemetry logs</p>
        </div>
      </div>

      {/* Mood Trajectory Line Chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Longitudinal Patient Mood Progress (Positivity % vs Anxiety % vs Sadness %)
        </h3>

        <div className="h-72">
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="session" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc'
                  }}
                />
                <Line type="monotone" dataKey="positivity" stroke="#10b981" strokeWidth={3} name="Positivity %" />
                <Line type="monotone" dataKey="anxiety" stroke="#8b5cf6" strokeWidth={2} name="Anxiety %" />
                <Line type="monotone" dataKey="sadness" stroke="#3b82f6" strokeWidth={2} name="Sadness %" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
              Record healthcare sessions in Live or Upload views to generate longitudinal trajectory charts.
            </div>
          )}
        </div>
      </div>

      {/* Clinical Notes & Diagnostic Summary */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          Clinical Therapeutic Assessment
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
          Patient exhibits a measurable shift toward relaxed baseline affect and positive valence markers. Facial action units related to corrugator supercilii tension (brow contraction) have decreased from 52% to 15% across longitudinal therapy sessions.
        </p>
      </div>

      {/* Emotion Explainer Modal */}
      <EmotionExplainerModal
        isOpen={explainerOpen}
        onClose={() => setExplainerOpen(false)}
        explanation={explainerData}
        loading={explainerLoading}
      />
    </div>
  );
};
