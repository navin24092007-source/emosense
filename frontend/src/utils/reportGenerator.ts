import { Session, EmotionLog, SessionAnalytics, EmotionExplanation } from '../types';

/**
 * Downloads a text file in the browser
 */
function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export list of sessions to CSV
 */
export function exportSessionsToCSV(sessions: Session[]) {
  const headers = ['Session ID', 'Context', 'Start Time', 'End Time', 'Duration (seconds)', 'Dominant Emotion', 'Samples Logged', 'Notes'];
  const rows = sessions.map(s => [
    s._id,
    s.context,
    new Date(s.startTime).toISOString(),
    s.endTime ? new Date(s.endTime).toISOString() : 'Active/Incomplete',
    s.durationSeconds || 0,
    s.dominantEmotion || 'neutral',
    s.logCount || 0,
    `"${(s.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const filename = `emosense-sessions-export-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csvContent, filename);
}

/**
 * Export single session frame logs to CSV
 */
export function exportSessionDetailToCSV(session: Session, logs: EmotionLog[]) {
  const headers = ['Sample #', 'Timestamp', 'Emotion', 'Confidence', 'Happy %', 'Sad %', 'Angry %', 'Surprise %', 'Fear %', 'Disgust %', 'Neutral %'];
  const rows = logs.map((log, idx) => {
    const p = log.all_probs || ({} as any);
    return [
      idx + 1,
      new Date(log.timestamp).toISOString(),
      log.emotion,
      (log.confidence * 100).toFixed(1) + '%',
      ((p.happy || 0) * 100).toFixed(1) + '%',
      ((p.sad || 0) * 100).toFixed(1) + '%',
      ((p.angry || 0) * 100).toFixed(1) + '%',
      ((p.surprise || 0) * 100).toFixed(1) + '%',
      ((p.fear || 0) * 100).toFixed(1) + '%',
      ((p.disgust || 0) * 100).toFixed(1) + '%',
      ((p.neutral || 0) * 100).toFixed(1) + '%'
    ];
  });

  const csvContent = [
    `# EmoSense Affective Telemetry Report`,
    `# Session ID: ${session._id}`,
    `# Context: ${session.context.toUpperCase()}`,
    `# Recorded: ${new Date(session.startTime).toLocaleString()}`,
    `# Dominant Emotion: ${session.dominantEmotion || 'neutral'}`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const filename = `emosense-session-${session._id.slice(-6)}-telemetry.csv`;
  downloadFile(csvContent, filename);
}

/**
 * Opens a print-ready formatted HTML report window that triggers print / Save as PDF
 */
export function printSessionReport(
  session: Session,
  logs: EmotionLog[],
  analytics: SessionAnalytics,
  explanation?: EmotionExplanation | null
) {
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Please allow popups to generate the printable report.');
    return;
  }

  const distributionHtml = Object.entries(analytics.distribution)
    .map(([emo, count]) => {
      const pct = analytics.totalLogs > 0 ? Math.round((count / analytics.totalLogs) * 100) : 0;
      return `
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:12px;">
          <span style="text-transform:capitalize; font-weight:600;">${emo}</span>
          <span>${count} samples (${pct}%)</span>
        </div>
        <div style="height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin-bottom:10px;">
          <div style="height:100%; width:${pct}%; background:#4f46e5;"></div>
        </div>
      `;
    })
    .join('');

  const recommendationsHtml = explanation?.recommendations
    ? explanation.recommendations.map(r => `<li style="margin-bottom:6px;">${r}</li>`).join('')
    : '<li>Review baseline affective variability across historical sessions.</li>';

  const facialCuesHtml = explanation?.facialCues
    ? explanation.facialCues.map(c => `<li style="margin-bottom:4px;">${c}</li>`).join('')
    : '<li>Standard facial action unit baseline metrics recorded.</li>';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>EmoSense Report - Session ${session._id.slice(-6)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; padding: 40px; margin:0; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #4f46e5; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
          .card-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .card-value { font-size: 20px; font-weight: 800; color: #0f172a; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .ai-box { background: #eef2ff; border-left: 4px solid #6366f1; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { text-align: left; background: #f1f5f9; padding: 8px; border-bottom: 1px solid #cbd5e1; }
          td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          @media print {
            body { padding: 15px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">EmoSense AI System</div>
            <div style="font-size:12px; color:#64748b;">Affective Intelligence & Facial Emotion Telemetry Report</div>
          </div>
          <div style="text-align:right;">
            <span class="badge">${session.context} Context</span>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">Date: ${new Date(session.startTime).toLocaleString()}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Dominant Emotion</div>
            <div class="card-value" style="text-transform:capitalize; color:#4f46e5;">${analytics.dominantEmotion}</div>
          </div>
          <div class="card">
            <div class="card-title">State Variability</div>
            <div class="card-value" style="text-transform:capitalize;">${analytics.variability}</div>
          </div>
          <div class="card">
            <div class="card-title">Telemetry Samples</div>
            <div class="card-value">${analytics.totalLogs} frames</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">AI Affective Diagnostic Summary</div>
          <div class="ai-box">
            <div style="font-weight:700; color:#3730a3; font-size:13px; margin-bottom:6px;">
              ${explanation ? explanation.summary : `Dominant state observed: ${analytics.dominantEmotion.toUpperCase()}`}
            </div>
            <p style="font-size:12px; color:#334155; margin:0 0 10px 0;">
              ${explanation ? explanation.domainInsight : 'Continuous frame analysis indicates consistent facial affect indicators with low autonomic state fluctuation.'}
            </p>
            <div style="font-size:11px; font-weight:700; color:#4f46e5; margin-bottom:4px;">Actionable Domain Guidance:</div>
            <ul style="font-size:12px; color:#334155; margin:0; padding-left:20px;">
              ${recommendationsHtml}
            </ul>
          </div>
        </div>

        <div class="section" style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
          <div>
            <div class="section-title">Emotion Distribution</div>
            ${distributionHtml}
          </div>
          <div>
            <div class="section-title">Observed Facial Action Units</div>
            <ul style="font-size:12px; color:#475569; margin:0; padding-left:18px;">
              ${facialCuesHtml}
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Sample Timeline Entries (First 15 Frames)</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Emotion</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${logs.slice(0, 15).map((l, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td style="text-transform:capitalize; font-weight:600;">${l.emotion}</td>
                  <td>${Math.round(l.confidence * 100)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:30px; text-align:center;" class="no-print">
          <button onclick="window.print()" style="background:#4f46e5; color:white; border:none; padding:10px 24px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:13px;">
            Print / Save as PDF
          </button>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
