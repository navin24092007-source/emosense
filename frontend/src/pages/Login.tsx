import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  BrainCircuit, Loader2, ArrowRight, Mail, Lock, Eye, EyeOff,
  User, ChevronDown, CheckCircle2, ShieldCheck, X
} from 'lucide-react';

const GOOGLE_CLIENT_ID = '15887127624-7ihrpsc97ko08itvuitooms2pbosl6tu.apps.googleusercontent.com';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'student',   label: '🎓 Student' },
  { value: 'teacher',   label: '👨‍🏫 Teacher / Instructor' },
  { value: 'therapist', label: '🩺 Therapist / Clinician' },
  { value: 'agent',     label: '🎧 Customer Experience' },
  { value: 'admin',     label: '🛡️ System Administrator' },
];

type Tab = 'signin' | 'register';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

/* ── Admin Modal ── */
const AdminModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [pwd, setPwd]     = useState('');
  const [show, setShow]   = useState(false);
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!pwd.trim()) { setErr('Please enter the admin password.'); return; }
    setLoading(true);
    try {
      await onSuccess();
    } catch (e: any) {
      setErr(e.response?.data?.message || 'Incorrect password. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 relative">
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
          <X className="w-4 h-4 text-slate-500" />
        </button>
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-800">Admin Access</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter the administrator password to continue</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Admin Password</label>
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <input id="admin-pwd" type={show ? 'text' : 'password'} placeholder="Enter admin password"
                value={pwd} onChange={e => { setPwd(e.target.value); setErr(''); }}
                className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" autoFocus />
              <button type="button" onClick={() => setShow(p => !p)} className="text-slate-400 hover:text-slate-600 transition">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {err}</div>}
          <button id="btn-admin-confirm" type="submit" disabled={loading || !pwd.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold text-sm shadow hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><ShieldCheck className="w-4 h-4" /> Login as Admin <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ══════════════════════ MAIN LOGIN PAGE ══════════════════════ */
export const Login: React.FC = () => {
  const { user, register, loginWithPassword, loginWithGoogle, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('signin');

  /* Sign-In state */
  const [siEmail,    setSiEmail]    = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siShowPwd,  setSiShowPwd]  = useState(false);
  const [siLoading,  setSiLoading]  = useState(false);
  const [siError,    setSiError]    = useState('');

  /* Register state */
  const [regName,    setRegName]    = useState('');
  const [regRole,    setRegRole]    = useState<UserRole>('student');
  const [regEmail,   setRegEmail]   = useState('');
  const [regPwd,     setRegPwd]     = useState('');
  const [regPwd2,    setRegPwd2]    = useState('');
  const [regShowPwd, setRegShowPwd] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError,   setRegError]   = useState('');
  const [regDone,    setRegDone]    = useState(false);

  /* Google & Admin */
  const [googleLoading,  setGoogleLoading]  = useState(false);
  const [googleRole,     setGoogleRole]     = useState<UserRole>('student');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail,     setAdminEmail]     = useState('admin@emosense.ai');

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard', { replace: true });
  }, [user, authLoading]);

  /* Google GSI init */
  useEffect(() => {
    if (!window.google?.accounts?.id) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: any) => {
          if (!response.credential) return;
          setGoogleLoading(true);
          try {
            const base64 = response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const profile = JSON.parse(decodeURIComponent(
              atob(base64).split('').map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            ));
            await loginWithGoogle({ credential: response.credential, email: profile.email, name: profile.name, googleId: profile.sub, role: googleRole });
            navigate('/dashboard');
          } catch (e: any) { alert('Google error: ' + (e.response?.data?.message || e.message)); }
          finally { setGoogleLoading(false); }
        },
        auto_select: false
      });
    } catch { /* silent */ }
  }, [googleRole]);

  const triggerGoogle = (role: UserRole) => {
    setGoogleRole(role);
    setGoogleLoading(true);
    if (window.google?.accounts?.oauth2) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tr: any) => {
          if (tr.error) { setGoogleLoading(false); return; }
          try {
            const res = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tr.access_token}` } });
            await loginWithGoogle({ email: res.data.email, name: res.data.name, googleId: res.data.sub, accessToken: tr.access_token, role });
            navigate('/dashboard');
          } catch (e: any) { alert('Google error: ' + (e.response?.data?.message || e.message)); }
          finally { setGoogleLoading(false); }
        }
      });
      client.requestAccessToken({ prompt: 'select_account' });
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((n: any) => { if (n.isNotDisplayed() || n.isSkippedMoment()) setGoogleLoading(false); });
    } else { setGoogleLoading(false); alert('Google Sign-In unavailable.'); }
  };

  /* ── Admin login via backend ── */
  const handleAdminLogin = async () => {
    await loginWithPassword(adminEmail, 'emosense@123');
    setShowAdminModal(false);
    navigate('/dashboard');
  };

  /* ── Sign In (backend) ── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiError('');
    if (!siEmail.trim())    { setSiError('Please enter your email.'); return; }
    if (!siPassword.trim()) { setSiError('Please enter your password.'); return; }
    setSiLoading(true);
    try {
      await loginWithPassword(siEmail.trim(), siPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setSiError(err.response?.data?.message || 'Sign-in failed. Please try again.');
    } finally {
      setSiLoading(false);
    }
  };

  /* ── Register (backend → MongoDB) ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim())  { setRegError('Please enter your name.'); return; }
    if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) { setRegError('Enter a valid email address.'); return; }
    if (regPwd.length < 6) { setRegError('Password must be at least 6 characters.'); return; }
    if (regPwd !== regPwd2) { setRegError('Passwords do not match.'); return; }
    setRegLoading(true);
    try {
      await register(regName.trim(), regEmail.trim().toLowerCase(), regPwd, regRole);
      setRegDone(true);
      setTimeout(() => { setTab('signin'); setSiEmail(regEmail.trim()); setRegDone(false); }, 1400);
    } catch (err: any) {
      setRegError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setRegLoading(false);
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-sm space-y-3">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      <div>Initializing EmoSense AI...</div>
    </div>
  );

  return (
    <>
      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={handleAdminLogin}
        />
      )}

      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0891b2 40%, #0e7490 100%)' }}>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-8 pt-10 pb-5 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg">
                <BrainCircuit className="w-9 h-9 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-indigo-700 tracking-tight">EmoSense.ai</h1>
            <p className="text-slate-500 text-sm mt-1">AI-Driven Emotional Intelligence Platform</p>
          </div>

          {/* Tabs */}
          <div className="flex px-8 mb-5 gap-2">
            {(['signin', 'register'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t ? 'bg-gradient-to-r from-green-400 to-blue-600 text-white shadow' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}>
                {t === 'signin' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* ══ SIGN IN ══ */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="px-8 pb-6 space-y-4">
              {/* Google FIRST */}
              <button id="btn-google-signin" type="button" disabled={googleLoading} onClick={() => triggerGoogle('student')}
                className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition shadow-sm disabled:opacity-50">
                {googleLoading ? <><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Connecting...</> : <><GoogleIcon /><span>Sign in with Google</span></>}
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200" /><span>or sign in with email</span><div className="flex-1 h-px bg-slate-200" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <input id="si-email" type="email" placeholder="Enter your email"
                    value={siEmail} onChange={e => setSiEmail(e.target.value)}
                    className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <input id="si-password" type={siShowPwd ? 'text' : 'password'} placeholder="Enter your password"
                    value={siPassword} onChange={e => setSiPassword(e.target.value)}
                    className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                  <button type="button" onClick={() => setSiShowPwd(p => !p)} className="text-slate-400 hover:text-slate-600 transition">
                    {siShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {siError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {siError}</div>}
              <button id="btn-signin" type="submit" disabled={siLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-blue-600 text-white font-bold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50">
                {siLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <p className="text-center text-xs text-slate-500">
                No account?{' '}
                <button type="button" onClick={() => setTab('register')} className="text-indigo-600 font-bold hover:underline">Register here →</button>
              </p>
            </form>
          )}

          {/* ══ REGISTER ══ */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="px-8 pb-6 space-y-4">
              {regDone ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 animate-bounce" />
                  <p className="text-emerald-600 font-bold text-lg">Account Created!</p>
                  <p className="text-slate-500 text-sm">Saved to database. Redirecting to Sign In...</p>
                </div>
              ) : (
                <>
                  {/* Google FIRST on Register */}
                  <button id="btn-google-register" type="button" disabled={googleLoading} onClick={() => triggerGoogle(regRole)}
                    className="w-full py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition shadow-sm disabled:opacity-50">
                    {googleLoading ? <><Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> Connecting...</> : <><GoogleIcon /><span>Sign up with Google</span></>}
                  </button>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="flex-1 h-px bg-slate-200" /><span>or register with email</span><div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <input id="reg-name" type="text" placeholder="e.g. Navin Kumar"
                        value={regName} onChange={e => setRegName(e.target.value)}
                        className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
                    <div className="relative">
                      <select id="reg-role" value={regRole} onChange={e => setRegRole(e.target.value as UserRole)}
                        className="w-full pl-4 pr-9 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition appearance-none font-medium">
                        {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <input id="reg-email" type="email" placeholder="you@example.com"
                        value={regEmail} onChange={e => setRegEmail(e.target.value)}
                        className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Create Password</label>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 px-3 gap-2 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <input id="reg-pwd" type={regShowPwd ? 'text' : 'password'} placeholder="Min. 6 characters"
                        value={regPwd} onChange={e => setRegPwd(e.target.value)}
                        className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                      <button type="button" onClick={() => setRegShowPwd(p => !p)} className="text-slate-400 hover:text-slate-600 transition">
                        {regShowPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm Password</label>
                    <div className={`flex items-center border rounded-xl bg-slate-50 px-3 gap-2 transition focus-within:ring-2 ${regPwd2 && regPwd !== regPwd2 ? 'border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-cyan-400 focus-within:ring-cyan-100'}`}>
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      <input id="reg-pwd2" type={regShowPwd ? 'text' : 'password'} placeholder="Repeat your password"
                        value={regPwd2} onChange={e => setRegPwd2(e.target.value)}
                        className="flex-1 py-3 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400" required />
                      {regPwd2 && regPwd === regPwd2 && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </div>
                  </div>
                  {regError && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">⚠️ {regError}</div>}
                  <button id="btn-register" type="submit" disabled={regLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-blue-600 text-white font-bold text-sm shadow-lg hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50">
                    {regLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : <><User className="w-4 h-4" /><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Already registered?{' '}
                    <button type="button" onClick={() => setTab('signin')} className="text-indigo-600 font-bold hover:underline">Sign In →</button>
                  </p>
                </>
              )}
            </form>
          )}

          {/* Admin Login Button */}
          <div className="mx-8 mb-8">
            <button id="btn-admin-access" type="button" onClick={() => setShowAdminModal(true)}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center gap-2 transition group">
              <ShieldCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Admin Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
