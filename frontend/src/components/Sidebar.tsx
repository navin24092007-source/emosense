import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { soundManager } from '../utils/audioFeedback';
import { 
  Video, 
  Upload, 
  LayoutDashboard, 
  GraduationCap, 
  Stethoscope, 
  Headphones, 
  UserCheck,
  Sparkles,
  Zap,
  BarChart3,
  BookOpen,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const { user } = useAuth();
  const role = user?.role || 'student';

  const navItems = [
    { to: '/live', label: 'Live Emotion Feed', icon: Video, color: 'text-rose-400', badge: 'Real-time' },
    { to: '/upload', label: 'Upload & Classify', icon: Upload, color: 'text-indigo-400', badge: '7-Class' },
    { 
      to: '/dashboard', 
      label: role === 'student' 
        ? 'Student Dashboard' 
        : role === 'teacher' 
          ? 'Teacher Dashboard' 
          : role === 'therapist' 
            ? 'Clinical Dashboard' 
            : role === 'agent' 
              ? 'CSAT Dashboard' 
              : 'Global Analytics Hub', 
      icon: LayoutDashboard, 
      color: 'text-sky-400', 
      badge: role === 'admin' ? 'All-Tab' : 'Role-Locked' 
    }
  ];

  const allDomainItems = [
    { 
      to: '/domain/education', 
      label: role === 'student' ? 'My Student Learning Hub' : 'Education Analytics', 
      icon: role === 'student' ? GraduationCap : BookOpen, 
      color: 'text-emerald-400', 
      desc: role === 'student' ? 'Focus, Confusion & Study Coach' : 'Classroom Attention & Group Affect',
      roles: ['student', 'teacher', 'admin']
    },
    { 
      to: '/domain/healthcare', 
      label: 'Healthcare & Clinical Mood', 
      icon: Stethoscope, 
      color: 'text-purple-400', 
      desc: 'Patient Affect & Stability Trajectory',
      roles: ['therapist', 'admin']
    },
    { 
      to: '/domain/customer', 
      label: 'Customer Experience (CSAT)', 
      icon: Headphones, 
      color: 'text-amber-400', 
      desc: 'Live Frustration & Sentiment Alerts',
      roles: ['agent', 'admin']
    }
  ];

  // Filter domain items according to the logged-in user's role
  const domainItems = allDomainItems.filter(item => item.roles.includes(role));

  const handleNavClick = () => {
    soundManager.playBlip(640, 50);
    if (onCloseMobile) onCloseMobile();
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'student': return { label: '🎓 Student Portal', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'teacher': return { label: '👨‍🏫 Teacher Portal', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
      case 'therapist': return { label: '🩺 Clinical Portal', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'agent': return { label: '🎧 CSAT Agent', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      default: return { label: '🛡️ System Admin', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
    }
  };

  const roleBadge = getRoleBadge();

  const content = (
    <div className="space-y-6">
      {/* Active Role Indicator Card */}
      <div className={`p-3 rounded-2xl border ${roleBadge.color} flex items-center justify-between`}>
        <div className="text-[11px] font-bold">
          {roleBadge.label}
        </div>
        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
          Active
        </span>
      </div>

      {/* Core Studio */}
      <div>
        <div className="px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Affective Studio</span>
          <Zap className="w-3 h-3 text-amber-400" />
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/40 font-bold shadow-lg shadow-indigo-600/10'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 group-hover:border-slate-700">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 group-hover:text-indigo-300">
                {item.badge}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Domain Hubs */}
      <div>
        <div className="px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>{role === 'student' ? 'My Learning Hub' : role === 'admin' ? 'All Domain Hubs' : 'Specialized Hub'}</span>
          <BarChart3 className="w-3 h-3 text-indigo-400" />
        </div>
        <nav className="space-y-1.5">
          {domainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/40 font-bold shadow-lg shadow-indigo-600/10'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`
              }
            >
              <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 group-hover:border-slate-700">
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div>
                <div className="font-semibold">{item.label}</div>
                <div className="text-[10px] text-slate-500 group-hover:text-slate-400">{item.desc}</div>
              </div>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile & Settings */}
      <div>
        <div className="px-3 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
          Configuration
        </div>
        <nav className="space-y-1">
          <NavLink
            to="/profile"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-medium text-xs transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-white border border-indigo-500/30 font-bold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <UserCheck className="w-4 h-4 text-slate-400" />
            </div>
            <span>User Profile & Privacy</span>
          </NavLink>
        </nav>
      </div>

      {/* Affective AI Quick Tip Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900/80 border border-indigo-500/20 space-y-2">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px]">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Insight Co-Pilot</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Need natural language explanation of confusion or CSAT results? Click <strong>Ask AI Co-Pilot</strong> anytime at bottom-right.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 glass-panel flex-shrink-0 border-r border-slate-800 hidden md:block min-h-[calc(100vh-4rem)] p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative w-72 glass-panel border-r border-slate-800 h-full p-4 overflow-y-auto z-10 animate-fade-in">
            {content}
          </aside>
        </div>
      )}
    </>
  );
};
