import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { BrainCircuit, GraduationCap, Stethoscope, Headphones, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

const GOOGLE_CLIENT_ID = "15887127624-7ihrpsc97ko08itvuitooms2pbosl6tu.apps.googleusercontent.com";

export const Login: React.FC = () => {
  const { user, loginWithDemo, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const roles: { role: UserRole; title: string; desc: string; icon: any; color: string }[] = [
    { role: 'student', title: 'Student', desc: 'Education & Learning Engagement', icon: GraduationCap, color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { role: 'teacher', title: 'Teacher / Instructor', desc: 'Classroom Confusion Monitoring', icon: GraduationCap, color: 'border-sky-500/40 text-sky-400 bg-sky-500/10' },
    { role: 'therapist', title: 'Therapist / Clinician', desc: 'Patient Longitudinal Mood Analytics', icon: Stethoscope, color: 'border-purple-500/40 text-purple-400 bg-purple-500/10' },
    { role: 'agent', title: 'Customer Rep', desc: 'Call Frustration & Sentiment Review', icon: Headphones, color: 'border-amber-500/40 text-amber-400 bg-amber-500/10' },
    { role: 'admin', title: 'System Admin', desc: 'Global Control & Data Policy', icon: ShieldCheck, color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' }
  ];

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

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithDemo(selectedRole, customName || undefined);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleLoading(true);

    // 1. Try Google Identity Services OAuth2 token client popup (select_account)
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

    // 2. Try Google Identity One-Tap Prompt
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGoogleLoading(false);
        }
      });
    } else {
      setGoogleLoading(false);
      alert('Google Sign-In is initializing. Please check your internet connection or try again in a few seconds.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Intro Banner */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                EmoSense
              </h1>
              <span className="text-xs font-semibold text-indigo-400 tracking-wider uppercase">
                AI Facial Emotion Intelligence System
              </span>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            EmoSense utilizes deep convolutional neural models and computer vision to detect micro-facial expressions in real-time, providing actionable affective analytics across Education, Healthcare, and Customer Experience.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Real-Time Webcam WebSocket Streaming Telemetry</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Domain-Specific Engagement & Sentiment Dashboards</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Python FastAPI CNN / ViT Microservice Integration</span>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">Sign In to EmoSense</h2>
            <p className="text-xs text-slate-400 mt-1">Select your workspace role to begin</p>
          </div>

          <form onSubmit={handleDemoSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Persona & Role
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => {
                  const IconComponent = r.icon;
                  const isSelected = selectedRole === r.role;
                  return (
                    <div
                      key={r.role}
                      onClick={() => setSelectedRole(r.role)}
                      className={`p-3 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? `${r.color} shadow-md`
                          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-200">{r.title}</div>
                          <div className="text-[10px] text-slate-400">{r.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Your Display Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Johnson"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entering System...</span>
                </>
              ) : (
                `Enter System as ${selectedRole.toUpperCase()}`
              )}
            </button>
          </form>

          <div className="relative border-t border-slate-800 pt-4 text-center">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">or sign in with OAuth 2.0</span>
            
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
              className="mt-3 w-full py-2.5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-600 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2.5 transition shadow-sm disabled:opacity-50"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Selecting Google Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google OAuth Sign In</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
