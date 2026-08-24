import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface EmotionRadarChartProps {
  distribution: Record<string, number>;
  height?: number;
}

export const EmotionRadarChart: React.FC<EmotionRadarChartProps> = ({ distribution, height = 260 }) => {
  const radarData = [
    { emotion: 'Happy', value: distribution.happy || 0, fullMark: 100 },
    { emotion: 'Surprise', value: distribution.surprise || 0, fullMark: 100 },
    { emotion: 'Neutral', value: distribution.neutral || 0, fullMark: 100 },
    { emotion: 'Sad', value: distribution.sad || 0, fullMark: 100 },
    { emotion: 'Disgust', value: distribution.disgust || 0, fullMark: 100 },
    { emotion: 'Angry', value: distribution.angry || 0, fullMark: 100 },
    { emotion: 'Fear', value: distribution.fear || 0, fullMark: 100 }
  ];

  return (
    <div className="w-full flex flex-col items-center justify-center" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="#334155" strokeOpacity={0.6} />
          <PolarAngleAxis
            dataKey="emotion"
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 'auto']}
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 9 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#f8fafc'
            }}
          />
          <Radar
            name="Emotion Footprint"
            dataKey="value"
            stroke="#818cf8"
            fill="#6366f1"
            fillOpacity={0.45}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
