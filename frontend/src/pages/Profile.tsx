import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import api from '../services/api';
import { UserCheck, Shield, Trash2, Save, CheckCircle2, User as UserIcon } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState<UserRole>(user?.role || 'student');
  const [autoDeleteDays, setAutoDeleteDays] = useState<number>(user?.autoDeleteDays || 30);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateUser({ name, role, autoDeleteDays });
      setMessage('Profile settings updated successfully!');
    } catch (err: any) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleManualCleanup = async () => {
    try {
      const res = await api.delete('/sessions/cleanup');
      alert(res.data.message);
    } catch (err: any) {
      alert('Cleanup failed: ' + err.message);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <UserCheck className="w-7 h-7 text-indigo-400" />
          User Profile & Data Preferences
        </h1>
        <p className="text-xs text-slate-400">
          Manage your account settings, active role persona, and data retention policies
        </p>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-xl">
            {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-xs text-slate-400">{user.email}</p>
            <div className="mt-1.5 inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
              Active Role: {user.role}
            </div>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                Active System Role
                <Shield className="w-3 h-3 text-amber-500" title="Roles are managed by Administrators" />
              </label>
              <select
                value={role}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-sm text-slate-400 cursor-not-allowed capitalize opacity-70"
              >
                <option value="student">Student (Education)</option>
                <option value="teacher">Teacher (Classroom Monitor)</option>
                <option value="therapist">Therapist (Clinical Healthcare)</option>
                <option value="agent">Customer Rep (Sentiment Review)</option>
                <option value="admin">System Admin</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Role assignments are managed by System Administrators.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Shield className="w-4 h-4 text-purple-400" />
              Automated Data Retention & Privacy Settings
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Auto-Delete Sessions Older Than
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={autoDeleteDays}
                    onChange={(e) => setAutoDeleteDays(Number(e.target.value))}
                    className="w-24 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">days</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleManualCleanup}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Purge Expired Sessions Now
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow-lg shadow-indigo-600/30 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
