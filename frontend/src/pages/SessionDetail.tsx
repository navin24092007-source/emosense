import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { Session, EmotionLog, SessionAnalytics, EmotionExplanation } from '../types';
import { LiveChart } from '../components/LiveChart';
import { EmotionRadarChart } from '../components/EmotionRadarChart';
import { ValenceArousalChart } from '../components/ValenceArousalChart';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { exportSessionDetailToCSV, printSessionReport } from '../utils/reportGenerator';
import { soundManager } from '../utils/audioFeedback';
import { emotionColors } from '../components/EmotionOverlay';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { 
  ArrowLeft, 
  Sparkles, 
  Activity, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Download, 
  Printer, 
  SlidersHorizontal,
  Compass,
  FileSpreadsheet
} from 'lucide-react';

const EMOTION_PIE_COLORS: Record<string, string> = {
  happy: '#10b981',
  sad: '#3b82f6',
  angry: '#ef4444',
  surprise: '#f59e0b',
  fear: '#8b5cf6',
  disgust: '#84cc16',
  neutral: '#6b7280'
};

export const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<EmotionLog[]>([]);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Explainer modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get(`/sessions/${id}`);
        setSession(res.data.session);
        setLogs(res.data.logs);
        setAnalytics(res.data.analytics);
      } catch (err) {
        console.error('Failed to fetch session detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleGenerateAIReport = async () => {
    if (!session || !analytics) return;
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const res = await api.post('/emotions/explain', {
        emotion: analytics.dominantEmotion,
        confidence: 0.90,
        context: session.context,
        variability: analytics.variability,
        totalLogs: analytics.totalLogs,
        sessionNotes: session.notes
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to generate AI report:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  const handlePrintReport = () => {
    if (!session || !analytics) return;
    soundManager.playBlip(540, 50);
    printSessionReport(session, logs, analytics, explainerData);
  };

  const handleExportCSV = () => {
    if (!session) return;
    soundManager.playBlip(540, 50);
    exportSessionDetailToCSV(session, logs);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <span>Loading session analytical model...</span>
      </div>
    );
  }

  if (!session || !analytics) {
    return (
      <div className="py-20 text-center text-slate-400 text-sm">
        Session record not found.
      </div>
    );
  }

  // Map all 7 emotions for the bar chart
  const barData = Object.entries(analytics.distribution).map(([emo, val]) => {
    const pct = analytics.totalLogs > 0 ? Math.round((val / analytics.totalLogs) * 100) : 0;
    return {
      name: emo,
      count: val,
      percentage: pct,
      value: val
    };
  });

  const domConfig = emotionColors[analytics.dominantEmotion] || emotionColors.neutral;

  return (
    <div className="space-y-6">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Analytics Dashboard</span>
        </Link>

        {/* Action Buttons: AI Report, CSV, Print PDF */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleGenerateAIReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:opacity-95 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Generate AI Diagnostic Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
            title="Download CSV Telemetry"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition"
            title="Print / Save as PDF Report"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Print / PDF Report</span>
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">Session Telemetry {session._id.slice(-6)}</h1>
            <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300">
              {session.context} Context
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recorded on {new Date(session.startTime).toLocaleString()}
          </p>
        </div>

        <div className={`px-4 py-2.5 rounded-2xl border ${domConfig.border} ${domConfig.bg} flex items-center gap-3 shadow-lg`}>
          <domConfig.icon className={`w-6 h-6 ${domConfig.text}`} />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Dominant Facial Affect</div>
            <div className={`text-base font-black capitalize ${domConfig.text}`}>
              {analytics.dominantEmotion}
            </div>
          </div>
        </div>
      </div>

      {/* Key Analytical Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Primary State Ratio</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold capitalize text-white">
            {analytics.dominantEmotion} ({analytics.totalLogs > 0 ? Math.round((analytics.distribution[analytics.dominantEmotion] / analytics.totalLogs) * 100) : 0}%)
          </div>
          <div className="text-[11px] text-slate-400">
            Active in {analytics.distribution[analytics.dominantEmotion]} of {analytics.totalLogs} recorded frame samples.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Affective Volatility & Stability</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold capitalize text-purple-300">
            {analytics.variability} Volatility
          </div>
          <div className="text-[11px] text-slate-400">
            State transition rate: {Math.round(analytics.transitionRate * 100)}% per second.
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Captured Frames</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white">
            {analytics.totalLogs} Frames Logged
          </div>
          <div className="text-[11px] text-slate-400">
            Streamed in-memory via WebSocket frame pipeline.
          </div>
        </div>
      </div>

      {/* Multi-Chart Analytics Grid: Radar Spectrum & Valence-Arousal Plane */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
              Session Emotion Radar Spectrum
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">7-Class Footprint</span>
          </div>
          <EmotionRadarChart distribution={analytics.distribution} height={230} />
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-purple-400" />
              Valence-Arousal Coordinate Plane
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">Circumplex Model</span>
          </div>
          <ValenceArousalChart currentEmotion={analytics.dominantEmotion} height={230} />
        </div>
      </div>

      {/* Timeline Chart + Bar Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveChart logs={logs} height={300} />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Emotion Distribution (Bar Graph)</span>
            <span className="text-[10px] text-slate-500 font-mono">{analytics.totalLogs} total frames</span>
          </h4>

          <div className="w-full h-52">
            {analytics.totalLogs > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f8fafc'
                    }}
                    cursor={{ fill: '#1e293b50' }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} frames (${item.payload.percentage}%)`,
                      'Frequency'
                    ]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {barData.map((entry) => (
                      <Cell key={entry.name} fill={EMOTION_PIE_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
                No emotion logs recorded for this session.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-800">
            {barData.filter(item => item.count > 0).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5 capitalize">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EMOTION_PIE_COLORS[item.name] }} />
                  <span>{item.name}</span>
                </div>
                <span className="font-mono text-slate-400">{item.count} ({item.percentage}%)</span>
              </div>
            ))}
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
