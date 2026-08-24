from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from app.utils import read_upload_image, decode_base64_image
from app.emotion_model import recognizer, EMOTION_LABELS

app = FastAPI(
    title="EmoSense AI Microservice",
    description="Facial Emotion Recognition microservice using OpenCV and PyTorch CNN",
    version="1.0.0"
)

# Enable CORS for local backend & frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FramePredictionRequest(BaseModel):
    image_base64: str

class EmotionPredictionResponse(BaseModel):
    emotion: str
    confidence: float
    all_probs: Optional[Dict[str, float]] = {}
    bbox: List[int]

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "EmoSense AI Microservice",
        "labels": EMOTION_LABELS,
        "model_loaded": recognizer.model_loaded
    }

@app.post("/predict_image", response_model=EmotionPredictionResponse)
async def predict_image(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        image = read_upload_image(file_bytes)
        result = recognizer.predict(image)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

@app.post("/predict_frame", response_model=EmotionPredictionResponse)
def predict_frame(request: FramePredictionRequest):
    try:
        if not request.image_base64 or len(request.image_base64.strip()) < 20:
            return {
                "emotion": "no_face",
                "confidence": 0.0,
                "all_probs": {l: 0.0 for l in EMOTION_LABELS},
                "bbox": [0, 0, 0, 0]
            }
        image = decode_base64_image(request.image_base64)
        result = recognizer.predict(image)
        return result
    except Exception as e:
        return {
            "emotion": "no_face",
            "confidence": 0.0,
            "all_probs": {l: 0.0 for l in EMOTION_LABELS},
            "bbox": [0, 0, 0, 0]
        }
