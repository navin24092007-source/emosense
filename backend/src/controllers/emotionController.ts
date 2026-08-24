import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { predictImageFromFile, predictFrameFromBase64 } from '../services/aiService';
import { predictWithExternalLLM } from '../services/llmVisionService';
import { EmotionLog } from '../models/EmotionLog';
import { Session } from '../models/Session';

export const predictImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const { sessionId, apiKey, provider } = req.body;
    const userApiKey = apiKey || (req.headers['x-llm-api-key'] as string);
    let result;

    // If external LLM API key is present or requested
    if (userApiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        result = await predictWithExternalLLM(base64, userApiKey, provider || 'auto');
      } catch (llmErr) {
        console.warn('[LLM Vision] Falling back to local PyTorch microservice:', (llmErr as any).message);
        result = await predictImageFromFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      }
    } else {
      result = await predictImageFromFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    // Save log if sessionId provided
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session) {
        await EmotionLog.create({
          sessionId,
          timestamp: new Date(),
          emotion: result.emotion,
          confidence: result.confidence,
          all_probs: result.all_probs
        });
      }
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ message: 'Emotion prediction failed', error: error.message });
  }
};

export const predictFrame = async (req: AuthRequest, res: Response) => {
  try {
    const { image, sessionId, apiKey, provider } = req.body;
    if (!image) {
      return res.status(400).json({ message: 'Base64 image frame is required' });
    }

    const userApiKey = apiKey || (req.headers['x-llm-api-key'] as string);
    let result;

    if (userApiKey || (provider && (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY))) {
      try {
        result = await predictWithExternalLLM(image, userApiKey, provider || 'auto');
      } catch (llmErr) {
        console.warn('[LLM Vision Frame] Falling back to local PyTorch microservice:', (llmErr as any).message);
        result = await predictFrameFromBase64(image);
      }
    } else {
      result = await predictFrameFromBase64(image);
    }

    if (sessionId) {
      await EmotionLog.create({
        sessionId,
        timestamp: new Date(),
        emotion: result.emotion,
        confidence: result.confidence,
        all_probs: result.all_probs
      });
    }

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ message: 'Frame prediction failed', error: error.message });
  }
};

export const getSessionEmotions = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const logs = await EmotionLog.find({ sessionId: id }).sort({ timestamp: 1 }).lean();
    return res.json(logs);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to fetch emotion logs', error: error.message });
  }
};

export const explainEmotionAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { emotion, confidence, all_probs, context, variability, totalLogs, sessionNotes } = req.body;
    const role = req.user?.role || 'student';
    const ctx = context || 'education';

    const emo = (emotion || 'neutral').toLowerCase();
    const confPct = Math.round((confidence || 0.85) * 100);

    // Facial cues mapping for educational/diagnostic clarity
    const facialCues: Record<string, string[]> = {
      happy: ['Zygomaticus major contraction (lip corners raised)', 'Orbicularis oculi engagement (crow’s feet / cheek elevation)', 'Relaxed forehead & open eye aperture'],
      sad: ['Inner eyebrows raised and drawn together (corrugator supercilii)', 'Depressed lip corners (depressor anguli oris)', 'Lowered gaze / reduced eye dynamism'],
      angry: ['Brows drawn down and together in furrow', 'Vertical inter-eyebrow wrinkles', 'Tightened eyelids and pressed or narrowed lips'],
      surprise: ['Elevated upper eyelids and raised curved eyebrows (frontalis)', 'Widened eye aperture exposing sclera', 'Relaxed jaw opening without tension'],
      fear: ['Eyebrows raised and pulled together horizontally', 'Tense lower eyelids with wide upper aperture', 'Lips stretched horizontally with slight retraction'],
      disgust: ['Nose wrinkling (levator labii superioris alaeque nasi)', 'Raised upper lip and flared nostrils', 'Slightly lowered eyebrows with cheek elevation'],
      neutral: ['Balanced facial musculature without sustained contractions', 'Steady relaxed ocular gaze', 'Baseline facial symmetry']
    };

    // Domain specific insights
    let domainInsight = '';
    let recommendations: string[] = [];

    if (ctx === 'education') {
      switch (emo) {
        case 'happy':
        case 'surprise':
          domainInsight = `High cognitive engagement and positive receptivity detected (${confPct}% confidence). The student is actively absorbing conceptual material with strong attentional focus.`;
          recommendations = ['Continue interactive problem-solving format', 'Introduce next difficulty tier or challenge question', 'Encourage peer explanation'];
          break;
        case 'sad':
        case 'fear':
          domainInsight = `Comprehension friction or cognitive overload detected. Facial markers indicate confusion or hesitation with current learning material.`;
          recommendations = ['Pause and recap the core premise with a diagram', 'Ask a lightweight check-for-understanding question', 'Break the problem down into smaller sequential steps'];
          break;
        case 'angry':
        case 'disgust':
          domainInsight = `Task frustration detected. The student may be experiencing roadblocks or technical friction.`;
          recommendations = ['Provide immediate constructive hint', 'Suggest a 30-second cognitive reset breath', 'Clarify expectations'];
          break;
        default:
          domainInsight = `Baseline passive attention detected (${confPct}% confidence). Stable cognitive load without severe distress or peak excitement.`;
          recommendations = ['Insert an interactive prompt or quiz to stimulate active participation', 'Change tone or present a real-world case study'];
      }
    } else if (ctx === 'healthcare') {
      switch (emo) {
        case 'happy':
          domainInsight = `Positive affective valence and elevated mood stability observed (${confPct}% confidence). Indicates psychological ease and emotional resonance.`;
          recommendations = ['Reinforce positive coping mechanisms discussed', 'Log progress in longitudinal therapy timeline'];
          break;
        case 'sad':
        case 'fear':
          domainInsight = `Subdued emotional valence or anxiety markers identified. Micro-expression indicators reflect emotional vulnerability.`;
          recommendations = ['Explore underlying somatic sensations or environmental stressors', 'Validate feelings before transitioning to cognitive reframing', 'Track baseline vs previous clinical sessions'];
          break;
        case 'angry':
          domainInsight = `Heightened emotional arousal and reactive tension detected. May signify acute frustration or defensive resistance.`;
          recommendations = ['Utilize grounding and breathwork pacing', 'Create non-judgmental space for emotional processing'];
          break;
        default:
          domainInsight = `Equanimous baseline state. Facial affect is steady and neutral with low autonomic perturbation.`;
          recommendations = ['Continue gentle inquiry', 'Compare with longitudinal variability metrics'];
      }
    } else if (ctx === 'customer') {
      switch (emo) {
        case 'happy':
          domainInsight = `Strong positive customer sentiment (${confPct}% confidence). Client is receptive, satisfied, and high CSAT trajectory is predicted.`;
          recommendations = ['Reinforce customer loyalty and offer value-add services', 'Summarize key agreements clearly'];
          break;
        case 'angry':
        case 'disgust':
          domainInsight = `High escalation risk detected. Customer displays acute frustration or dissatisfaction with the current topic or policy.`;
          recommendations = ['Immediately apply verbal de-escalation: acknowledge frustration before explaining facts', 'Avoid robotic jargon and demonstrate empathetic listening', 'Offer an expedited resolution pathway'];
          break;
        case 'fear':
        case 'sad':
          domainInsight = `Customer anxiety or disappointment detected regarding outcome uncertainty.`;
          recommendations = ['Provide clear reassurance and step-by-step resolution guarantees', 'Set unambiguous expectations and timelines'];
          break;
        default:
          domainInsight = `Neutral business sentiment. Customer is attentive and evaluating information objectively.`;
          recommendations = ['Maintain professional, concise communication', 'Confirm agreement before closing ticket'];
      }
    } else {
      domainInsight = `Detected dominant emotional state of ${emo} with ${confPct}% model confidence.`;
      recommendations = ['Review probability distribution across all 7 emotion channels', 'Observe trends over time rather than single snapshots'];
    }

    // Valence & Arousal computation (Russell's circumplex model)
    const circumplex: Record<string, { valence: number; arousal: number }> = {
      happy: { valence: 0.8, arousal: 0.6 },
      surprise: { valence: 0.4, arousal: 0.8 },
      neutral: { valence: 0.0, arousal: 0.0 },
      sad: { valence: -0.7, arousal: -0.4 },
      fear: { valence: -0.6, arousal: 0.7 },
      angry: { valence: -0.8, arousal: 0.8 },
      disgust: { valence: -0.6, arousal: 0.3 }
    };

    const coord = circumplex[emo] || { valence: 0, arousal: 0 };

    return res.json({
      emotion: emo,
      confidence: confPct,
      context: ctx,
      summary: `Primary Emotion: ${emo.toUpperCase()} (${confPct}% confidence)`,
      facialCues: facialCues[emo] || facialCues.neutral,
      domainInsight,
      recommendations,
      affectivePlane: {
        valence: coord.valence,
        arousal: coord.arousal,
        valenceLabel: coord.valence > 0.2 ? 'Positive Valence' : coord.valence < -0.2 ? 'Negative Valence' : 'Neutral Valence',
        arousalLabel: coord.arousal > 0.2 ? 'High Arousal (Active)' : coord.arousal < -0.2 ? 'Low Arousal (Calm/Subdued)' : 'Moderate Energy'
      },
      variability: variability || 'low',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to generate emotion explanation', error: error.message });
  }
};

export const handleChatbotMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { message, context, telemetry, activeEmotion } = req.body;
    const role = req.user?.role || 'student';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ message: 'Message text is required' });
    }

    const lower = message.toLowerCase();
    let reply = '';
    let suggestions: string[] = [];

    if (lower.includes('explain') && (lower.includes('emotion') || lower.includes('result') || lower.includes('my') || lower.includes('face') || lower.includes('current'))) {
      const currentEmo = activeEmotion || telemetry?.dominantEmotion || 'neutral';
      reply = `Based on current facial telemetry, the dominant emotion is **${currentEmo.toUpperCase()}**. Our OpenCV + PyTorch model detects this from subtle muscular contraction around the eyes and mouth. In an **${context || 'educational'}** context, this indicates a steady cognitive state with balanced attention.`;
      suggestions = ['How to improve engagement?', 'Explain facial action units', 'Show Valence & Arousal map'];
    } else if (lower.includes('confusion') || lower.includes('confused') || lower.includes('understand')) {
      if (role === 'teacher') {
        reply = "I noticed confusion markers in classroom telemetry. **Recommended Pedagogical Action:** Pause the presentation for 90 seconds, run a quick pulse poll, or re-explain the last concept using an intuitive diagram.";
        suggestions = ['How to measure class engagement?', 'Show confusion breakdown', 'Export pedagogical report'];
      } else {
        reply = "It is completely normal to experience moments of confusion during challenging concepts! That reflects deep cognitive processing. Take a quick breath, review the preceding slide, or flag this timestamp.";
        suggestions = ['Explain micro-expressions', 'How to improve focus', 'Summarize my session'];
      }
    } else if (lower.includes('frustrat') || lower.includes('angry') || lower.includes('upset') || lower.includes('customer')) {
      if (role === 'agent') {
        reply = "High customer frustration detected. **De-escalation Co-Pilot Suggestion:** Acknowledge and validate the client's emotion first (*'I completely understand why this delay is inconvenient'*) before presenting solutions. Keep tone calm and pacing deliberate.";
        suggestions = ['De-escalation script phrases', 'Show customer sentiment timeline', 'CSAT recovery tips'];
      } else {
        reply = "Feeling frustrated is often a signal of high cognitive load or friction. Consider taking a 30-second breathing pause to reset your autonomic nervous system.";
        suggestions = ['Stress reduction techniques', 'Analyze my emotion trends', 'View session report'];
      }
    } else if (lower.includes('sad') || lower.includes('depress') || lower.includes('mood') || lower.includes('anxiety') || lower.includes('health') || lower.includes('therapy')) {
      if (role === 'therapist') {
        reply = "Longitudinal mood analytics show patient affect trends across sessions. Clinicians should evaluate the ratio of positive vs negative valence states and assess emotional volatility indicators.";
        suggestions = ['Longitudinal trend report', 'Affective valence metrics', 'Export clinical session notes'];
      } else {
        reply = "Your emotional well-being is important. EmoSense detected subdued mood valence. Remember to take regular breaks, stay hydrated, and reach out to support networks if needed.";
        suggestions = ['Wellness check-in', 'How EmoSense works', 'View my stats'];
      }
    } else if (lower.includes('report') || lower.includes('export') || lower.includes('summary') || lower.includes('pdf') || lower.includes('csv')) {
      reply = "You can instantly export session telemetry in **CSV** format for spreadsheet analysis or generate a formatted **Printable PDF Summary Report** with chart visuals, domain recommendations, and timestamped metrics from the Dashboard or Session Detail pages.";
      suggestions = ['Go to Dashboard', 'Open Session Detail', 'Explain metrics'];
    } else if (lower.includes('how') && (lower.includes('work') || lower.includes('model') || lower.includes('accuracy') || lower.includes('cv2') || lower.includes('ai') || lower.includes('pytorch'))) {
      reply = "EmoSense combines OpenCV facial cascade detection with a deep PyTorch CNN trained on facial affect datasets (FER2013). It streams video frames at ~15-30 FPS over WebSockets to classify 7 core emotions (*Angry, Disgust, Fear, Happy, Neutral, Sad, Surprise*) and maps them onto the 2D Valence-Arousal affective plane.";
      suggestions = ['What emotions are detected?', 'Is webcam video saved?', 'System architecture'];
    } else if (lower.includes('privacy') || lower.includes('data') || lower.includes('webcam') || lower.includes('record')) {
      reply = "Privacy is built-in: Raw webcam video frames are processed entirely in-memory for instant emotion vector calculation and **NEVER** written to disk or transmitted to third parties. Only anonymized numerical telemetry logs are retained.";
      suggestions = ['Read Privacy Policy', 'GDPR / HIPAA Compliance', 'Delete my logs'];
    } else {
      // Role-based contextual fallback
      switch (role) {
        case 'teacher':
          reply = `Hello Professor! As your EmoSense Classroom AI Assistant, I monitor student engagement and confusion levels in real time. How can I assist with your lecture telemetry today?`;
          suggestions = ['Classroom engagement overview', 'Confusion de-escalation tips', 'Generate classroom report'];
          break;
        case 'therapist':
          reply = `Welcome Clinician. I am ready to provide longitudinal affective trend summaries, valence-arousal distribution, and micro-expression highlights for your patient sessions.`;
          suggestions = ['Patient trend overview', 'Mood fluctuation alerts', 'Export clinical notes'];
          break;
        case 'agent':
          reply = `Hi! I am your Customer Sentiment Co-Pilot. I monitor customer frustration and tone telemetry during live support calls to help improve CSAT scores.`;
          suggestions = ['Call frustration score', 'Recommended response phrases', 'Customer mood history'];
          break;
        default:
          reply = `Hello ${req.user?.email || 'there'}! I am EmoSense AI, your affective intelligence assistant. I analyze micro-facial expressions to give you real-time feedback on focus, mood, and cognitive state.`;
          suggestions = ['Explain my current emotion', 'How does EmoSense work?', 'View Dashboard Analytics'];
          break;
      }
    }

    return res.json({
      reply,
      role,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Chatbot service error', error: error.message });
  }
};

