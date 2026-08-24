import React, { useState } from 'react';
import api from '../services/api';
import { EmotionPrediction, EmotionExplanation } from '../types';
import { EmotionRadarChart } from '../components/EmotionRadarChart';
import { EmotionExplainerModal } from '../components/EmotionExplainerModal';
import { soundManager } from '../utils/audioFeedback';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  RefreshCw, 
  Sparkles, 
  Save, 
  Download,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { emotionColors } from '../components/EmotionOverlay';

export const UploadImage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<EmotionPrediction | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [sessionContext, setSessionContext] = useState<'education' | 'healthcare' | 'customer'>('education');

  // Explainer modal state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerData, setExplainerData] = useState<EmotionExplanation | null>(null);
  const [explainerLoading, setExplainerLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPrediction(null);
      setSavedSuccess(false);
      soundManager.playBlip(580, 50);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setSavedSuccess(false);
    soundManager.playBlip(620, 60);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const res = await api.post('/emotions/predict-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      soundManager.playSuccessChime();
      setPrediction(res.data);
    } catch (err: any) {
      alert('Prediction error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExplain = async () => {
    if (!prediction) return;
    soundManager.playBlip(700, 60);
    setExplainerOpen(true);
    setExplainerLoading(true);

    try {
      const res = await api.post('/emotions/explain', {
        emotion: prediction.emotion,
        confidence: prediction.confidence,
        all_probs: prediction.all_probs,
        context: sessionContext,
        totalLogs: 1
      });
      setExplainerData(res.data);
    } catch (err) {
      console.error('Failed to explain image:', err);
    } finally {
      setExplainerLoading(false);
    }
  };

  const handleSaveToSession = async () => {
    if (!prediction) return;
    try {
      const sessRes = await api.post('/sessions', { 
        context: sessionContext, 
        notes: `Uploaded static image analysis: ${selectedFile?.name || 'portrait'}` 
      });
      await api.post('/emotions/predict-frame', {
        image: previewUrl,
        sessionId: sessRes.data._id
      });
      soundManager.playSuccessChime();
      setSavedSuccess(true);
    } catch (err) {
      console.error('Failed to save to session:', err);
    }
  };

  const currentConfig = prediction ? emotionColors[prediction.emotion] || emotionColors.neutral : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-md">
            <Upload className="w-6 h-6" />
          </div>
          Upload Image & Static Analysis
        </h1>
        <p className="text-xs text-slate-400">
          Upload portraits or facial photographs for instant 7-class emotion classification, radar footprint, and AI explanation
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Uploader Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Select or Drop Portrait Image
            </label>

            <div className="relative border-2 border-dashed border-slate-700/80 hover:border-indigo-500/70 rounded-3xl p-8 text-center transition flex flex-col items-center justify-center min-h-[240px] bg-slate-900/40 cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 mb-3 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-transform">
                <ImageIcon className="w-9 h-9" />
              </div>
              <div className="text-sm font-bold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click or Drag Portrait Here'}
              </div>
              <p className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP up to 10MB</p>
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 font-bold text-xs text-white shadow-xl shadow-indigo-600/30 hover:opacity-95 hover:scale-102 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Deep Neural Feature Extraction...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Classify Facial Emotion</span>
              </>
            )}
          </button>
        </div>

        {/* Right Result Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Inference Results & Visual Output
          </h3>

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center shadow-inner">
              <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 aspect-video flex items-center justify-center text-slate-500 text-xs italic">
              Image preview will render here
            </div>
          )}

          {prediction && currentConfig && (
            <div className="space-y-4 pt-2 border-t border-slate-800 animate-fade-in">
              <div className={`p-4 rounded-2xl border ${currentConfig.border} ${currentConfig.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-900 ${currentConfig.text} border border-slate-800 shadow-md`}>
                    <currentConfig.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Dominant Emotion</div>
                    <div className={`text-xl font-black capitalize ${currentConfig.text}`}>
                      {prediction.emotion}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Model Confidence</div>
                  <div className="text-xl font-black text-white">
                    {Math.round(prediction.confidence * 100)}%
                  </div>
                </div>
              </div>

              {/* Action Buttons: Explain with AI & Save */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleExplain}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Explain Facial Cues with AI</span>
                </button>

                <button
                  onClick={handleSaveToSession}
                  disabled={savedSuccess}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition disabled:opacity-60"
                >
                  {savedSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Saved to History</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-indigo-400" />
                      <span>Save to History</span>
                    </>
                  )}
                </button>
              </div>

              {/* Context Selector */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Save Context:</span>
                <select
                  value={sessionContext}
                  onChange={(e) => setSessionContext(e.target.value as any)}
                  disabled={savedSuccess}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 outline-none focus:border-indigo-500 transition"
                >
                  <option value="education">Education</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7-Class Softmax Probability Radar breakdown for uploaded image */}
      {prediction && prediction.all_probs && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                Complete 7-Class Emotion Probability Radar
              </h3>
              <p className="text-[11px] text-slate-500">
                Visual representation of facial muscle activation across all 7 categorical states.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            <EmotionRadarChart distribution={prediction.all_probs} height={240} />

            <div className="space-y-2">
              {Object.entries(prediction.all_probs).map(([emo, prob]) => {
                const pct = Math.round(prob * 100);
                const isDominant = prediction.emotion === emo;
                return (
                  <div key={emo} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold capitalize text-slate-300">
                      <span className={isDominant ? 'text-indigo-400 font-bold' : ''}>{emo}</span>
                      <span className={isDominant ? 'text-white font-bold' : 'text-slate-400'}>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isDominant ? 'bg-gradient-to-r from-indigo-500 to-pink-500' : 'bg-slate-700'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
