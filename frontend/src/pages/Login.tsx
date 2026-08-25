import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
  BrainCircuit, 
  GraduationCap, 
  BookOpen, 
  Stethoscope, 
  Headphones, 
  ShieldCheck, 
  Sparkles, 
  Loader2,
  ArrowRight,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

const GOOGLE_CLIENT_ID = "15887127624-7ihrpsc97ko08itvuitooms2pbosl6tu.apps.googleusercontent.com";

interface RolePersona {
  role: UserRole;
  title: string;
  badge: string;
  defaultName: string;
  desc: string;
  icon: any;
  borderActive: string;
  bgGradient: string;
  accentColor: string;
  features: string[];
}

export const Login: React.FC = () => {
  const { user, loginWithDemo, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [customName, setCustomName] = useState('');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const rolePersonas: RolePersona[] = [
    { 
      role: 'student', 
      title: 'Student Portal', 
      badge: 'Learner Experience',
      defaultName: 'Alex Johnson (Student)',
      desc: 'Personal learning engagement, confusion index, focus tracking & study coach.', 
      icon: GraduationCap, 
      borderActive: 'border-emerald-500 bg-emerald-950/30 text-emerald-300 ring-2 ring-emerald-500/30',
      bgGradient: 'from-emerald-600 to-teal-700',
      accentColor: 'text-emerald-400',
      features: ['Personal Confusion Index', 'Cognitive Focus Peaks', 'Study Fatigue Alerts']
    },
    { 
      role: 'teacher', 
      title: 'Teacher / Instructor', 
      badge: 'Classroom Analytics',
      defaultName: 'Prof. Sarah Miller (Instructor)',
      desc: 'Real-time classroom confusion alerts, group engagement & attentional metrics.', 
      icon: BookOpen, 
      borderActive: 'border-sky-500 bg-sky-950/30 text-sky-300 ring-2 ring-sky-500/30',
      bgGradient: 'from-sky-600 to-indigo-700',
      accentColor: 'text-sky-400',
      features: ['Classroom Group Valence', 'Real-time Confusion Warning', 'Student Engagement Index']
    },
    { 
      role: 'therapist', 
      title: 'Therapist / Clinician', 
      badge: 'Clinical Telemetry',
      defaultName: 'Dr. Marcus Vance (Therapist)',
      desc: 'Longitudinal affect stability, Russell Valence-Arousal & grounding triggers.', 
      icon: Stethoscope, 
      borderActive: 'border-purple-500 bg-purple-950/30 text-purple-300 ring-2 ring-purple-500/30',
      bgGradient: 'from-purple-600 to-pink-700',
      accentColor: 'text-purple-400',
      features: ['Valence-Arousal Plane', 'Affect Volatility Index', 'Intervention Prompts']
    },
    { 
      role: 'agent', 
      title: 'Customer Experience', 
      badge: 'CSAT & Frustration',
      defaultName: 'Elena Rostova (CSAT Lead)',
      desc: 'Live call agitation detection, sentiment trajectory & escalation triggers.', 
      icon: Headphones, 
      borderActive: 'border-amber-500 bg-amber-950/30 text-amber-300 ring-2 ring-amber-500/30',
      bgGradient: 'from-amber-600 to-orange-700',
      accentColor: 'text-amber-400',
      features: ['Agitation & Frustration Risk', 'Net Sentiment Score', 'Real-time Escalation Alerts']
    },
    { 
      role: 'admin', 
      title: 'System Administrator', 
      badge: 'Global Overview',
      defaultName: 'System Admin',
      desc: 'Full multi-vertical oversight, global session history & raw AI telemetry.', 
      icon: ShieldCheck, 
      borderActive: 'border-rose-500 bg-rose-950/30 text-rose-300 ring-2 ring-rose-500/30',
      bgGradient: 'from-rose-600 to-red-700',
      accentColor: 'text-rose-400',
      features: ['All Domain Dashboards', 'Global Multi-Session Logs', 'FastAPI Microservice Control']
    }
  ];

  // Quick 1-Click Login handler
  const handleQuickLogin = async (persona: RolePersona) => {
    setLoadingRole(persona.role);
    try {
      const displayName = customName.trim() || persona.defaultName;
      await loginWithDemo(persona.role, displayName);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed. Please try again.');
    } finally {
      setLoadingRole(null);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            if (response.credential) {
              setGoogleLoading(true);
              try {
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const profile = JSON.parse(jsonPayload);
                await loginWithGoogle({
                  credential: response.credential,
                  email: profile.email,
                  name: customName || profile.name,
                  googleId: profile.sub,
                  role: selectedRole
                });
                navigate('/dashboard');
              } catch (err: any) {
                console.error('Google ID Token auth error:', err);
                alert('Google Sign-In failed: ' + (err.response?.data?.message || err.message));
              } finally {
                setGoogleLoading(false);
              }
            }
          },
          auto_select: false
        });
      } catch (err) {
        console.warn('Google GSI init notice:', err);
      }
    }
  }, [selectedRole, customName]);

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              console.error('Google OAuth Error:', tokenResponse);
              setGoogleLoading(false);
              return;
            }
            try {
              const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const profile = res.data;
              await loginWithGoogle({
                email: profile.email,
                name: customName || profile.name,
                googleId: profile.sub,
                accessToken: tokenResponse.access_token,
                role: selectedRole
              });
              navigate('/dashboard');
            } catch (err: any) {
              console.error('Google userinfo fetch failed:', err);
              alert('Google Sign-In failed: ' + (err.response?.data?.message || err.message));
            } finally {
              setGoogleLoading(false);
            }
          }
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('oauth2.initTokenClient failed, fallback to id.prompt:', err);
      }
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGoogleLoading(false);
        }
      });
    } else {
      setGoogleLoading(false);
      alert('Google Sign-In is initializing. Please check your internet connection.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Top Header Banner */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold shadow-inner">
            <BrainCircuit className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span>EmoSense • Role-Based Affective Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Choose Your Login Portal
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Select your persona below. Your dashboard will automatically tailor its analytics, metrics, and tools specifically to your role.
          </p>
        </div>

        {/* 5 Distinct 1-Click Role Login Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rolePersonas.map((persona) => {
            const Icon = persona.icon;
            const isProcessing = loadingRole === persona.role;

            return (
              <div
                key={persona.role}
                className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between space-y-5 group relative overflow-hidden shadow-xl"
              >
                <div className="space-y-4">
                  {/* Top Header & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 group-hover:scale-105 transition-transform">
                      <Icon className={`w-6 h-6 ${persona.accentColor}`} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950/80 text-slate-400">
                      {persona.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {persona.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {persona.desc}
                    </p>
                  </div>

                  {/* Feature Highlights */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    {persona.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                        <CheckCircle2 className={`w-3.5 h-3.5 ${persona.accentColor} flex-shrink-0`} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 1-Click Action Button */}
                <button
                  type="button"
                  disabled={loadingRole !== null || googleLoading}
                  onClick={() => handleQuickLogin(persona)}
                  className={`w-full py-3 rounded-2xl bg-gradient-to-r ${persona.bgGradient} font-bold text-xs text-white shadow-lg hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Entering Portal...</span>
                    </>
                  ) : (
                    <>
                      <span>Login as {persona.title.split('/')[0].trim()}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}

          {/* 6th Card: Custom Name & Google OAuth Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 bg-slate-900/60 flex flex-col justify-between space-y-4 shadow-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <UserCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950/80 text-indigo-400">
                  Custom & Google
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Customized Login</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in with your name or Google Account into any role.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Navin Kumar"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize font-semibold"
                >
                  <option value="student">🎓 Student</option>
                  <option value="teacher">👨‍🏫 Teacher / Instructor</option>
                  <option value="therapist">🩺 Therapist / Clinician</option>
                  <option value="agent">🎧 Customer Experience</option>
                  <option value="admin">🛡️ System Administrator</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={loadingRole !== null || googleLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Connecting Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

