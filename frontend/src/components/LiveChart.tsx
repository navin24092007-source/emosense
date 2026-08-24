import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { EmotionLog } from '../types';

interface LiveChartProps {
  logs: EmotionLog[];
  height?: number;
}

export const LiveChart: React.FC<LiveChartProps> = ({ logs, height = 220 }) => {
  // Format last 30s logs for Recharts
  const chartData = logs.slice(-30).map((log) => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      time: timeStr,
      confidence: Math.round(log.confidence * 100),
      emotion: log.emotion,
      happy: log.all_probs?.happy ? Math.round(log.all_probs.happy * 100) : 0,
      sad: log.all_probs?.sad ? Math.round(log.all_probs.sad * 100) : 0,
      angry: log.all_probs?.angry ? Math.round(log.all_probs.angry * 100) : 0,
      neutral: log.all_probs?.neutral ? Math.round(log.all_probs.neutral * 100) : 0,
    };
  });

  return (
    <div className="w-full glass-panel p-4 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Live Emotion Stream (Last 30 Seconds)
        </h4>
        <span className="text-[11px] text-indigo-400 font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          Real-time Socket.io Stream
        </span>
      </div>

      <div style={{ width: '100%', height }}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="time" stroke="#94a3b8" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
              />
              <Line type="monotone" dataKey="confidence" stroke="#6366f1" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Confidence" />
              <Line type="monotone" dataKey="happy" stroke="#10b981" strokeWidth={1.5} dot={false} name="Happy %" />
              <Line type="monotone" dataKey="sad" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Sad %" />
              <Line type="monotone" dataKey="angry" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Angry %" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs italic">
            No telemetry stream recorded yet. Start session to record.
          </div>
        )}
      </div>
    </div>
  );
};
