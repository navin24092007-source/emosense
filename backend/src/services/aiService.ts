import axios from 'axios';
import FormData from 'form-data';
import http from 'http';
import https from 'https';

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 10 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

export interface EmotionPredictionResult {
  emotion: string;
  confidence: number;
  all_probs: Record<string, number>;
  bbox: number[];
}

export const predictImageFromFile = async (
  fileBuffer: Buffer, 
  filename: string, 
  mimeType: string,
  retries: number = 1
): Promise<EmotionPredictionResult> => {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename, contentType: mimeType });

    const response = await axios.post<EmotionPredictionResult>(
      `${AI_SERVICE_URL}/predict_image`,
      formData,
      { 
        headers: formData.getHeaders(),
        httpAgent,
        httpsAgent,
        timeout: 25000 // 25s timeout to gracefully accommodate cloud cold starts
      }
    );
    return response.data;
  } catch (error: any) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
      console.warn(`[Backend AI Service] Cold-start or transient error (${error.message}). Retrying in 2.5s...`);
      await new Promise((r) => setTimeout(r, 2500));
      return predictImageFromFile(fileBuffer, filename, mimeType, retries - 1);
    }
    console.error('[Backend AI Service] Error communicating with FastAPI /predict_image:', error.message);
    throw new Error('AI microservice prediction failed');
  }
};

export const predictFrameFromBase64 = async (
  base64Image: string,
  retries: number = 1
): Promise<EmotionPredictionResult> => {
  try {
    const response = await axios.post<EmotionPredictionResult>(
      `${AI_SERVICE_URL}/predict_frame`,
      { image_base64: base64Image },
      { 
        headers: { 'Content-Type': 'application/json' },
        httpAgent,
        httpsAgent,
        timeout: 20000
      }
    );
    return response.data;
  } catch (error: any) {
    if (retries > 0 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
      console.warn(`[Backend AI Service] Frame retry on cold-start (${error.message})...`);
      await new Promise((r) => setTimeout(r, 1500));
      return predictFrameFromBase64(base64Image, retries - 1);
    }
    console.error('[Backend AI Service] Error communicating with FastAPI /predict_frame:', error.message);
    throw new Error('AI microservice frame prediction failed');
  }
};
