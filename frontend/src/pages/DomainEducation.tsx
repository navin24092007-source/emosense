import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Session, EmotionExplanation } from '../types';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { exportSessionsToCSV } from '../utils/reportGenerator';
import { soundManager } from '../utils/audioFeedback';
import { 
  GraduationCap, 
  HelpCircle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Sparkles, 
  Download 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DomainEducation: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Explainer modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  useEffect(() => {
    const fetchEdu = async () => {
      try {
        const res = await api.get('/sessions');
        const eduSessions = res.data.filter((s: Session) => s.context === 'education');
        setSessions(eduSessions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEdu();
  }, []);

  const handleExplain = async () => {
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const res = await api.post('/emotions/explain', {
        emotion: sessions.length > 0 ? (sessions[0].dominantEmotion || 'surprise') : 'surprise',
        confidence: 0.94,
        context: 'education',
        variability: 'low',
        totalLogs: sessions.length
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to explain education metrics:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  const confusedCount = sessions.filter(s => s.dominantEmotion === 'sad' || s.dominantEmotion === 'fear').length;
  const engagedCount = sessions.filter(s => s.dominantEmotion === 'happy' || s.dominantEmotion === 'neutral' || s.dominantEmotion === 'surprise').length;
  const engagementScore = sessions.length > 0 ? Math.round((engagedCount / sessions.length) * 100) : 88;

  const chartData = sessions.slice(-7).map((s, idx) => ({
    session: `Class ${idx + 1}`,
    engagement: s.dominantEmotion === 'happy' ? 94 : s.dominantEmotion === 'surprise' ? 90 : 76,
    confusion: s.dominantEmotion === 'sad' || s.dominantEmotion === 'fear' ? 42 : 10
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            Education Analytics & Classroom Engagement Tracker
          </h1>
          <p className="text-xs text-slate-400">
            Aggregate real-time affective telemetry across classroom sessions to detect student comprehension gaps
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExplain}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>Explain Classroom Affect</span>
          </button>

          <button
            onClick={() => exportSessionsToCSV(sessions)}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overall Engagement Index</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{engagementScore}%</div>
          <p className="text-[11px] text-slate-400">High student attentiveness and positive facial affect</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Confusion Spikes Detected</span>
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{confusedCount} Sessions</div>
          <p className="text-[11px] text-slate-400">Puzzled / micro-frustration expression triggers</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Classroom Sessions</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{sessions.length}</div>
          <p className="text-[11px] text-slate-400">Tracked with real-time Socket.io streams</p>
        </div>
      </div>

      {/* Engagement vs Confusion Bar Chart */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Classroom Engagement vs Confusion Index (Recent Sessions)
        </h3>

        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Bar dataKey="engagement" fill="#10b981" name="Engagement %" radius={[6, 6, 0, 0]} />
                <Bar dataKey="confusion" fill="#f59e0b" name="Confusion %" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
              Record education sessions to populate engagement vs confusion comparisons.
            </div>
          )}
        </div>
      </div>

      {/* Pedagogical Insights */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Pedagogical Recommendations
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-bold text-emerald-400">High Surprise / Curiosity Detection</div>
            <p className="text-slate-400">Students exhibit elevated micro-expressions of surprise during interactive demonstrations. Continue incorporating visual examples.</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
            <div className="font-bold text-amber-400">Pacing Adjustment Advisory</div>
            <p className="text-slate-400">When confusion markers cross 25%, automatically prompt the instructor to pause for a check-for-understanding Q&A.</p>
          </div>
        </div>
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
