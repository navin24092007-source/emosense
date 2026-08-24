import axios from 'axios';
import FormData from 'form-data';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface EmotionPredictionResult {
  emotion: string;
  confidence: number;
  all_probs: Record<string, number>;
  bbox: number[];
}

export const predictImageFromFile = async (fileBuffer: Buffer, filename: string, mimeType: string): Promise<EmotionPredictionResult> => {
  try {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename, contentType: mimeType });

    const response = await axios.post<EmotionPredictionResult>(
      `${AI_SERVICE_URL}/predict_image`,
      formData,
      { headers: formData.getHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('[Backend AI Service] Error communicating with FastAPI /predict_image:', error.message);
    throw new Error('AI microservice prediction failed');
  }
};

export const predictFrameFromBase64 = async (base64Image: string): Promise<EmotionPredictionResult> => {
  try {
    const response = await axios.post<EmotionPredictionResult>(
      `${AI_SERVICE_URL}/predict_frame`,
      { image_base64: base64Image },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error: any) {
    console.error('[Backend AI Service] Error communicating with FastAPI /predict_frame:', error.message);
    throw new Error('AI microservice frame prediction failed');
  }
};
