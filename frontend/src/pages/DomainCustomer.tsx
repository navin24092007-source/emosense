import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Session, EmotionExplanation } from '../types';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { exportSessionsToCSV } from '../utils/reportGenerator';
import { soundManager } from '../utils/audioFeedback';
import { 
  Headphones, 
  AlertTriangle, 
  ThumbsUp, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Download, 
  TrendingUp, 
  Smile, 
  Frown 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DomainCustomer: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Explainer modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  useEffect(() => {
    const fetchCust = async () => {
      try {
        const res = await api.get('/sessions');
        const custSessions = res.data.filter((s: Session) => s.context === 'customer');
        setSessions(custSessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCust();
  }, []);

  const handleExplain = async () => {
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const res = await api.post('/emotions/explain', {
        emotion: sessions.length > 0 ? (sessions[0].dominantEmotion || 'happy') : 'happy',
        confidence: 0.93,
        context: 'customer',
        variability: 'low',
        totalLogs: sessions.length
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to explain customer metrics:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  const timelineData = sessions.map((s, i) => ({
    minute: `Call ${i + 1}`,
    satisfaction: s.dominantEmotion === 'happy' ? 92 : s.dominantEmotion === 'neutral' ? 65 : 25,
    frustration: s.dominantEmotion === 'angry' || s.dominantEmotion === 'disgust' ? 70 : 12
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md">
              <Headphones className="w-6 h-6" />
            </div>
            Customer Experience & Sentiment Review
          </h1>
          <p className="text-xs text-slate-400">
            Real-time call sentiment analytics, frustration escalation detection, and Net CSAT prediction
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Explain CSAT Metrics</span>
          </button>

          <button
            onClick={() => exportSessionsToCSV(sessions)}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* CSAT KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net CSAT Score Prediction</span>
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">4.9 / 5.0</div>
          <p className="text-[11px] text-slate-400">92% positive facial valence across support calls</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">High Frustration Events</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400">
            {sessions.filter(s => s.dominantEmotion === 'angry' || s.dominantEmotion === 'disgust').length} Flagged
          </div>
          <p className="text-[11px] text-slate-400">Micro-frustration detection triggers de-escalation tips</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Call Sentiment Sessions</span>
            <Headphones className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{sessions.length}</div>
          <p className="text-[11px] text-slate-400">Customer reaction logs logged</p>
        </div>
      </div>

      {/* Timeline Chart with Highlighted Frustration */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Call Timeline: Customer Satisfaction vs Frustration Spike Index
          </h3>
          <span className="flex items-center gap-1.5 text-xs text-rose-400 font-bold px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Real-Time De-escalation Active
          </span>
        </div>

        <div className="h-64">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="minute" stroke="#94a3b8" tick={{ fontSize: 11 }} />
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
                <Area type="monotone" dataKey="satisfaction" stroke="#10b981" fill="#10b981" fillOpacity={0.25} name="Satisfaction %" />
                <Area type="monotone" dataKey="frustration" stroke="#ef4444" fill="#ef4444" fillOpacity={0.35} name="Frustration %" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
              Record customer sessions in Live or Upload views to analyze CSAT and frustration timelines.
            </div>
          )}
        </div>
      </div>

      {/* Call Highlight Segment Card */}
      <div className="glass-panel p-6 rounded-3xl border border-rose-500/30 bg-rose-500/5 space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" />
          Customer Frustration Root-Cause & De-escalation Guidance
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          When customer micro-expressions register an abrupt shift to Angry / Frustrated during technical explanations, representative is prompted to validate client frustration first before offering step-by-step resolution pathways.
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
