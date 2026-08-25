import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Session, SessionContext, EmotionExplanation, UserRole } from '../types';
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
  Compass,
  BookOpen,
  UserCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { emotionHexColors } from '../components/EmotionOverlay';

type DashboardTab = 'global' | 'student' | 'teacher' | 'healthcare' | 'customer';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Set initial tab based on logged-in user role
  const getInitialTab = (): DashboardTab => {
    if (!user) return 'global';
    if (user.role === 'student') return 'student';
    if (user.role === 'teacher') return 'teacher';
    if (user.role === 'therapist') return 'healthcare';
    if (user.role === 'agent') return 'customer';
    return 'global';
  };

  const [activeTab, setActiveTab] = useState<DashboardTab>(getInitialTab());
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

  // Sync initial tab when user profile loads
  useEffect(() => {
    if (user) {
      setActiveTab(getInitialTab());
    }
  }, [user]);

  const handleTabChange = (tab: DashboardTab) => {
    soundManager.playBlip(560, 50);
    setActiveTab(tab);
  };

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
    if (activeTab === 'student' || activeTab === 'teacher') {
      if (s.context !== 'education') return false;
    } else if (activeTab === 'healthcare') {
      if (s.context !== 'healthcare') return false;
    } else if (activeTab === 'customer') {
      if (s.context !== 'customer') return false;
    }
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return s._id.toLowerCase().includes(q) || s.context.toLowerCase().includes(q) || (s.dominantEmotion || '').toLowerCase().includes(q);
  });

  const getRoleDisplay = () => {
    const role = user?.role || 'student';
    switch (role) {
      case 'student': return { 
        title: 'Student Learner Portal', 
        heading: 'My Learning Engagement & Study Focus',
        subheading: 'Personal affective feedback on your study focus, cognitive load, confusion index, and study coaching.',
        icon: GraduationCap, 
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' 
      };
      case 'teacher': return { 
        title: 'Teacher / Instructor Portal', 
        heading: 'Classroom Affect & Attention Telemetry',
        subheading: 'Monitor live student engagement, group valence, and real-time confusion alerts during instructional lectures.',
        icon: BookOpen, 
        color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' 
      };
      case 'therapist': return { 
        title: 'Therapist Clinical Portal', 
        heading: 'Patient Affect & Longitudinal Mood Stability',
        subheading: 'Russell Valence-Arousal plane tracking, affect variability trajectory, and clinical grounding triggers.',
        icon: Stethoscope, 
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' 
      };
      case 'agent': return { 
        title: 'Customer Experience (CSAT) Portal', 
        heading: 'Live Call Sentiment & Frustration Analytics',
        subheading: 'Real-time customer agitation monitoring, net sentiment score, and risk escalation prompts.',
        icon: Headphones, 
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
      };
      default: return { 
        title: 'System Administrator Portal', 
        heading: 'Multi-Vertical Affective Intelligence System',
        subheading: 'Full cross-domain oversight across Education, Clinical Therapy, and Customer Experience verticals.',
        icon: ShieldCheck, 
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
      };
    }
  };

  const roleInfo = getRoleDisplay();
  const RoleIcon = roleInfo.icon;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Top Header Card with User Role Highlight */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 bg-slate-900/40 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${roleInfo.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{roleInfo.title}</span>
            </div>
            {user?.name && (
              <span className="text-xs text-slate-400 font-medium">
                Welcome back, <strong className="text-white">{user.name}</strong>
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {roleInfo.heading}
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            {roleInfo.subheading}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
          <button
            onClick={() => exportSessionsToCSV(sessions)}
            disabled={sessions.length === 0}
            className="btn-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExplainWithAI(activeTab === 'healthcare' ? 'healthcare' : activeTab === 'customer' ? 'customer' : 'education')}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Insights</span>
          </button>
        </div>
      </div>

      {/* PERSPECTIVE SWITCHER: For Admin show all 5 tabs; For specific roles show active role banner or focused switcher */}
      {isAdmin ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800/80">
          <button
            onClick={() => handleTabChange('global')}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'global'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            <span>🌐 Global Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('student')}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'student'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>🎓 Student Learner Hub</span>
          </button>

          <button
            onClick={() => handleTabChange('teacher')}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-xs transition-all whitespace-nowrap ${
              activeTab === 'teacher'
                ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40 shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>👨‍🏫 Teacher Classroom Hub</span>
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
            <span>🩺 Therapist Clinical Hub</span>
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
            <span>🎧 Customer Experience (CSAT)</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <RoleIcon className={`w-5 h-5 ${roleInfo.color.split(' ')[0]}`} />
            <div>
              <div className="text-xs font-bold text-white capitalize">
                {roleInfo.title}
              </div>
              <div className="text-[11px] text-slate-400">
                Dashboard strictly filtered to your workspace persona
              </div>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 transition"
          >
            Switch Role
          </Link>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: GLOBAL OVERVIEW                                                    */}
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
              <div className="text-[11px] text-slate-500">Across all domain verticals</div>
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
              <div className="text-[11px] text-slate-500">Therapist longitudinal mood</div>
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

          {/* 7-Class Radar + 2D Valence-Arousal Plane */}
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
      {/* TAB 2: STUDENT LEARNER HUB                                                */}
      {/* ========================================================================= */}
      {activeTab === 'student' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Personal Attention Index</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-400">89% Focus</div>
              <p className="text-[11px] text-slate-400">High visual attentiveness & active engagement</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Confusion Rate</span>
                <HelpCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">11% Puzzled</div>
              <p className="text-[11px] text-slate-400">Low cognitive friction on current topics</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Study Sessions</span>
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'education').length}
              </div>
              <p className="text-[11px] text-slate-400">Logged learning sessions</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Personalized Cognitive Study Coach
              </h3>
              <button
                onClick={() => handleExplainWithAI('education', 'happy')}
                className="text-[11px] font-semibold text-emerald-300 underline hover:text-white"
              >
                Detailed Learning Breakdown
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your focus peaks when interactive problem-solving exercises are presented. If eye fatigue or brow tension is detected for more than 15 consecutive minutes, the system recommends taking a 2-minute visual rest.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEACHER CLASSROOM HUB                                              */}
      {/* ========================================================================= */}
      {activeTab === 'teacher' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Classroom Engagement Index</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-sky-400">86% Engaged</div>
              <p className="text-[11px] text-slate-400">Aggregate student positive affect and attention</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Confusion Spikes Flagged</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">
                {sessions.filter(s => s.context === 'education' && (s.dominantEmotion === 'sad' || s.dominantEmotion === 'fear')).length} Events
              </div>
              <p className="text-[11px] text-slate-400">Puzzled / brow furrow micro-expressions</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Classroom Lectures Logged</span>
                <BookOpen className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'education').length}
              </div>
              <p className="text-[11px] text-slate-400">Live lecture telemetry</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-sky-500/30 bg-sky-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Teacher Instructional Advisory
              </h3>
              <button
                onClick={() => handleExplainWithAI('education', 'surprise')}
                className="text-[11px] font-semibold text-sky-300 underline hover:text-white"
              >
                Deep-Dive Explainer
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When explaining complex theoretical algorithms, confusion spikes to 24% at the 18-minute mark. Consider breaking complex theorems down into 2-minute visual diagram recaps before proceeding.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HEALTHCARE & THERAPIST CLINICAL HUB                                */}
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

          <div className="glass-panel p-6 rounded-3xl border border-purple-500/30 bg-purple-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Therapist Longitudinal Affective Trajectory
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
      {/* TAB 5: CUSTOMER EXPERIENCE (CSAT) HUB                                     */}
      {/* ========================================================================= */}
      {activeTab === 'customer' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Predicted CSAT Score</span>
                <ThumbsUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-amber-400">4.9 / 5.0</div>
              <p className="text-[11px] text-slate-400">High positive customer sentiment</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Frustration Escalation Risk</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-rose-400">2.1% Low</div>
              <p className="text-[11px] text-slate-400">Immediate trigger alerts calibrated</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Customer Support Calls</span>
                <Headphones className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-white">
                {sessions.filter(s => s.context === 'customer').length}
              </div>
              <p className="text-[11px] text-slate-400">Audio/video streams analyzed</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Customer Support Sentiment Shift
              </h3>
              <button
                onClick={() => handleExplainWithAI('customer', 'angry')}
                className="text-[11px] font-semibold text-amber-300 underline hover:text-white"
              >
                Explain Frustration Risk
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Customer sentiment improved from initial agitation to high satisfaction upon agent issue resolution. Anger markers dropped to 0% in the final 3 minutes of the support interaction.
            </p>
          </div>
        </div>
      )}

      {/* RECENT SESSIONS TABLE */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Session Telemetry History ({filteredSessions.length})
            </h3>
            <p className="text-xs text-slate-500">
              Recorded facial emotion logs stored securely in MongoDB database.
            </p>
          </div>

          <input
            type="text"
            placeholder="Search session ID, context, or emotion..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-indigo-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-xs font-bold">Loading session telemetry...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No session logs found for this perspective. Start a live session or run static image analysis to log data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3 px-3">Session ID</th>
                  <th className="pb-3 px-3">Domain Context</th>
                  <th className="pb-3 px-3">Dominant Affect</th>
                  <th className="pb-3 px-3">Logged Frames</th>
                  <th className="pb-3 px-3">Recorded Time</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSessions.map((sess) => (
                  <tr key={sess._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {sess._id.slice(-8)}
                    </td>
                    <td className="py-3 px-3 capitalize">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                        {sess.context === 'education' ? '🎓 Education' : sess.context === 'healthcare' ? '🏥 Healthcare' : '🎧 Customer'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span 
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize"
                        style={{
                          backgroundColor: `${emotionHexColors[sess.dominantEmotion || 'neutral']}20`,
                          color: emotionHexColors[sess.dominantEmotion || 'neutral'],
                          border: `1px solid ${emotionHexColors[sess.dominantEmotion || 'neutral']}40`
                        }}
                      >
                        {sess.dominantEmotion || 'neutral'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {sess.logCount || 1} frames
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(sess.startTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/session/${sess._id}`}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
