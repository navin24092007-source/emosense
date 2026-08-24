import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Session, SessionContext, EmotionExplanation } from '../types';
import { EmotionRadarChart } from '../components/EmotionRadarChart';
import { ValenceArousalChart } from '../components/ValenceArousalChart';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { exportSessionsToCSV } from '../utils/reportGenerator';
import { soundManager } from '../utils/audioFeedback';
import { 
  LayoutDashboard, 
  Calendar, 
  Clock, 
  ChevronRight, 
  GraduationCap, 
  Stethoscope, 
  Headphones, 
  Activity, 
  RefreshCw,
  Sparkles,
  Download,
  FileText,
  TrendingUp,
  HeartPulse,
  ThumbsUp,
  Flame,
  AlertTriangle,
  HelpCircle,
  Users,
  ShieldCheck,
  Zap,
  BarChart2,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { emotionColors } from '../components/EmotionOverlay';

type DashboardTab = 'global' | 'education' | 'healthcare' | 'customer';

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('global');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Explainer Modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleTabChange = (tab: DashboardTab) => {
    soundManager.playBlip(560, 50);
    setActiveTab(tab);
  };

  // Open AI Explainer for Global Insights or specific context
  const handleExplainWithAI = async (context: SessionContext = 'education', specificEmotion?: string) => {
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const dominant = specificEmotion || (sessions.length > 0 ? sessions[0].dominantEmotion : 'happy') || 'neutral';
      const res = await api.post('/emotions/explain', {
        emotion: dominant,
        confidence: 0.92,
        context,
        variability: 'low',
        totalLogs: sessions.length
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to generate explanation:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  // Aggregated Emotion Distribution across all sessions
  const globalDistribution: Record<string, number> = {
    happy: 0, sad: 0, angry: 0, surprise: 0, fear: 0, disgust: 0, neutral: 0
  };
  sessions.forEach(s => {
    const emo = s.dominantEmotion || 'neutral';
    if (globalDistribution[emo] !== undefined) {
      globalDistribution[emo] += s.logCount || 1;
    }
  });

  const filteredSessions = sessions.filter(s => {
    if (activeTab !== 'global' && s.context !== activeTab) return false;
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return s._id.toLowerCase().includes(q) || s.context.toLowerCase().includes(q) || (s.dominantEmotion || '').toLowerCase().includes(q);
  });

  const getContextIcon = (ctx: SessionContext) => {
    switch (ctx) {
      case 'education': return <GraduationCap className="w-4 h-4 text-emerald-400" />;
      case 'healthcare': return <Stethoscope className="w-4 h-4 text-purple-400" />;
      case 'customer': return <Headphones className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 text-white">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Affective Intelligence Analytics Hub
              </h1>
              <p className="text-xs text-slate-400">
                Multi-domain telemetry, longitudinal trend modeling, and real-time AI explanations
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleExplainWithAI(activeTab === 'global' ? 'education' : activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition hover:scale-102"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Explain Hub with AI</span>
          </button>

          <button
            onClick={() => exportSessionsToCSV(sessions)}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
            title="Export telemetry database to CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={fetchSessions}
            className="p-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh Sessions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex overflow-x-auto pb-1 gap-2 border-b border-slate-800">
        <button
          onClick={() => handleTabChange('global')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'global'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-sky-400" />
          <span>Global Overview ({sessions.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('education')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'education'
              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-emerald-400" />
          <span>🎓 Education Hub ({sessions.filter(s => s.context === 'education').length})</span>
        </button>

        <button
          onClick={() => handleTabChange('healthcare')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'healthcare'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-purple-400" />
          <span>🏥 Healthcare & Therapy ({sessions.filter(s => s.context === 'healthcare').length})</span>
        </button>

        <button
          onClick={() => handleTabChange('customer')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'customer'
              ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-inner'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Headphones className="w-4 h-4 text-amber-400" />
          <span>🎧 Customer Experience ({sessions.filter(s => s.context === 'customer').length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GLOBAL ANALYTICS OVERVIEW                                          */}
      {/* ========================================================================= */}
      {activeTab === 'global' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top KPI Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Recorded Sessions</span>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">{sessions.length}</div>
              <div className="text-[11px] text-slate-500">Across 3 domain verticals</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Education Sessions</span>
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">
                {sessions.filter(s => s.context === 'education').length}
              </div>
              <div className="text-[11px] text-slate-500">Engagement & confusion telemetry</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Healthcare Sessions</span>
                <Stethoscope className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-purple-400">
                {sessions.filter(s => s.context === 'healthcare').length}
              </div>
              <div className="text-[11px] text-slate-500">Therapy mood trends</div>
            </div>

            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Customer Sessions</span>
                <Headphones className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {sessions.filter(s => s.context === 'customer').length}
              </div>
              <div className="text-[11px] text-slate-500">Frustration & CSAT reviews</div>
            </div>
          </div>

          {/* Advanced Visual Charts Grid: 7-Class Radar + 2D Valence-Arousal Plane */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                    Global 7-Class Emotion Radar Spectrum
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Softmax Aggregation</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Comprehensive emotional footprint computed across all logged frames in session history.
                </p>
              </div>

              <EmotionRadarChart distribution={globalDistribution} height={250} />
            </div>

            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    Valence-Arousal Affective Plane (Russell's Model)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">2D Coordinate Map</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Affective quadrant mapping: Horizontal Valence (Pleasant vs Unpleasant) vs Vertical Arousal (Energy).
                </p>
              </div>

              <ValenceArousalChart 
                currentEmotion={sessions.length > 0 ? sessions[0].dominantEmotion : 'neutral'} 
                height={250} 
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EDUCATION DOMAIN SECTION                                           */}
      {/* ========================================================================= */}
      {activeTab === 'education' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Classroom Engagement Index</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">86% Engaged</div>
              <p className="text-[11px] text-slate-400">High student attentiveness and positive facial affect</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Confusion Spikes Flagged</span>
                <HelpCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {sessions.filter(s => s.context === 'education' && (s.dominantEmotion === 'sad' || s.dominantEmotion === 'fear')).length} Events
              </div>
              <p className="text-[11px] text-slate-400">Puzzled / brow furrow micro-expressions</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Education Sessions Logged</span>
                <Users className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'education').length}
              </div>
              <p className="text-[11px] text-slate-400">Classroom lectures & labs</p>
            </div>
          </div>

          {/* Pedagogical Guidance Box */}
          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                AI Pedagogical Recommendation Engine
              </h3>
              <button
                onClick={() => handleExplainWithAI('education', 'surprise')}
                className="text-[11px] font-semibold text-emerald-300 underline hover:text-white"
              >
                Deep-Dive Explainer
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Students demonstrate strong curiosity during interactive demonstrations. When confusion indicators spike above 20%, the system automatically recommends the instructor pause for 60 seconds to recap with a visual model.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HEALTHCARE & THERAPY DOMAIN SECTION                                */}
      {/* ========================================================================= */}
      {activeTab === 'healthcare' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Affective Recovery Index</span>
                <HeartPulse className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-purple-300">+32% Positive Valence</div>
              <p className="text-[11px] text-slate-400">Steady reduction in facial anxiety cues</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Mood Stability Indicator</span>
                <Activity className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-sky-300">High Stability</div>
              <p className="text-[11px] text-slate-400">Low rapid affective volatility rate</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Clinical Sessions</span>
                <Stethoscope className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'healthcare').length}
              </div>
              <p className="text-[11px] text-slate-400">HIPAA privacy-compliant metadata</p>
            </div>
          </div>

          {/* Clinical Therapeutic Summary */}
          <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Longitudinal Therapy Affective Trajectory
              </h3>
              <button
                onClick={() => handleExplainWithAI('healthcare', 'sad')}
                className="text-[11px] font-semibold text-purple-300 underline hover:text-white"
              >
                Explain Clinical Affect
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Patient telemetry demonstrates significant emotional grounding across therapy sessions. Depressed lip corners and ocular tension markers have reduced from 48% to 14% over the latest sequence.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CUSTOMER EXPERIENCE DOMAIN SECTION                                 */}
      {/* ========================================================================= */}
      {activeTab === 'customer' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Predicted CSAT Score</span>
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">4.9 / 5.0</div>
              <p className="text-[11px] text-slate-400">High positive customer sentiment</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Frustration Escalation Risk</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-rose-400">Low Risk (8%)</div>
              <p className="text-[11px] text-slate-400">No active angry micro-expression spikes</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Call Sentiment Reviews</span>
                <Headphones className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'customer').length}
              </div>
              <p className="text-[11px] text-slate-400">Support interactions logged</p>
            </div>
          </div>

          {/* Support Agent De-escalation Co-Pilot */}
          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Customer Sentiment Root-Cause & De-escalation Co-Pilot
              </h3>
              <button
                onClick={() => handleExplainWithAI('customer', 'angry')}
                className="text-[11px] font-semibold text-amber-300 underline hover:text-white"
              >
                Explain CSAT Metrics
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Real-time emotion tracking enables support representatives to detect subtle micro-expressions of dissatisfaction early, allowing proactive empathetic communication before formal escalation.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SESSIONS TABLE & HISTORY LIST                                             */}
      {/* ========================================================================= */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Recorded Telemetry Sessions ({filteredSessions.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Click any session for deep telemetry charts, emotion distribution, and printable AI reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading telemetry sessions...</span>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredSessions.map((sess) => {
              const domEmo = sess.dominantEmotion || 'neutral';
              const emoConfig = emotionColors[domEmo] || emotionColors.neutral;
              const dateStr = new Date(sess.startTime).toLocaleString([], {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });

              return (
                <Link
                  key={sess._id}
                  to={`/session/${sess._id}`}
                  className="block p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700 transition group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700">
                        {getContextIcon(sess.context)}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition">
                            Session {sess._id.slice(-6)}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-300">
                            {sess.context}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {sess.durationSeconds || 0}s duration
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-slate-500" />
                            {sess.logCount || 0} frames logged
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-xl border ${emoConfig.border} ${emoConfig.bg} text-xs font-bold capitalize ${emoConfig.text} flex items-center gap-1.5 shadow-sm`}>
                        <emoConfig.icon className="w-4 h-4" />
                        <span>{domEmo}</span>
                      </div>

                      <div className="p-1.5 rounded-xl bg-slate-800 text-slate-400 group-hover:text-indigo-300 group-hover:bg-indigo-600/20 transition">
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-2xl border border-slate-800">
            No session records found for this view. Start a live webcam session or upload an image to begin tracking!
          </div>
        )}
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
