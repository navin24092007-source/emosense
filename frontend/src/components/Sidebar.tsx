import React from 'react';
import { NavLink } from 'react-router-dom';
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
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onCloseMobile }) => {
  const navItems = [
    { to: '/live', label: 'Live Emotion Feed', icon: Video, color: 'text-rose-400', badge: 'Real-time' },
    { to: '/upload', label: 'Upload & Classify', icon: Upload, color: 'text-indigo-400', badge: '7-Class' },
    { to: '/dashboard', label: 'Global Analytics Hub', icon: LayoutDashboard, color: 'text-sky-400', badge: 'Multi-Tab' }
  ];

  const domainItems = [
    { to: '/domain/education', label: 'Education Analytics', icon: GraduationCap, color: 'text-emerald-400', desc: 'Engagement & Confusion' },
    { to: '/domain/healthcare', label: 'Healthcare & Mood', icon: Stethoscope, color: 'text-purple-400', desc: 'Patient Trajectory' },
    { to: '/domain/customer', label: 'Customer Experience', icon: Headphones, color: 'text-amber-400', desc: 'Frustration & CSAT' }
  ];

  const handleNavClick = () => {
    soundManager.playBlip(640, 50);
    if (onCloseMobile) onCloseMobile();
  };

  const content = (
    <div className="space-y-6">
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
          <span>Domain Hubs</span>
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
