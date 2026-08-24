import React from 'react';
import { ShieldCheck, X, Eye, Lock, HardDrive } from 'lucide-react';

interface PrivacyNoticeProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-700/70 text-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Privacy & Data Governance Notice</h3>
            <p className="text-xs text-slate-400">EmoSense Privacy Standards</p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <p className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/50 text-xs leading-relaxed text-slate-200">
            “We process facial images to detect real-time emotions. You retain complete authority and can stop your webcam or session anytime. All metric logs are stored strictly per your account settings.”
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Eye className="w-4 h-4 text-indigo-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">Ephemerality of Raw Video</div>
                <div className="text-[11px] text-slate-400">Raw webcam video frames are processed in-memory for emotion inference and are never saved to persistent disk.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">User Scope & Security</div>
                <div className="text-[11px] text-slate-400">Calculated emotion metrics (e.g., happy 85%) are encrypted and linked exclusively to your user ID.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HardDrive className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-xs text-slate-200">Configurable Data Retention</div>
                <div className="text-[11px] text-slate-400">Configure automated session log purge schedules (e.g. 7, 30, or 90 days) in your User Settings.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
