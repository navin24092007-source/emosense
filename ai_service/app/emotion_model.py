import os
import cv2
import json
import base64
import numpy as np
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env if present
load_dotenv()

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
GROQ_MODELS = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"]
GROQ_MODEL = "qwen/qwen3.8-27b"

_client: Optional[Groq] = None

def get_groq_client() -> Optional[Groq]:
    """
    Lazily initializes and returns the Groq client from environment variables.
    """
    global _client
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    if _client is None:
        _client = Groq(api_key=api_key)
    return _client

def encode_bgr_to_base64_jpeg(bgr_image: np.ndarray, quality: int = 85) -> str:
    """
    Encodes an OpenCV BGR image matrix into a base64 JPEG string.
    """
    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    success, buffer = cv2.imencode('.jpg', bgr_image, encode_param)
    if not success:
        raise ValueError("Failed to encode image to JPEG")
    return base64.b64encode(buffer).decode('utf-8')

def normalize_emotion_response(
    raw_data: Dict[str, Any],
    image_shape: tuple
) -> Dict[str, Any]:
    """
    Normalizes the parsed JSON output from Groq Vision to guarantee strict
    adherence to the frontend EmotionPrediction interface.
    """
    img_h, img_w = image_shape[:2]
    
    # 1. Normalize emotion label
    raw_emotion = str(raw_data.get("emotion", "neutral")).strip().lower()
    emotion = raw_emotion if raw_emotion in EMOTION_LABELS else "neutral"
    
    # 2. Normalize confidence
    try:
        confidence = float(raw_data.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))
    except (ValueError, TypeError):
        confidence = 0.85

    # 3. Normalize all_probs dictionary
    raw_probs = raw_data.get("all_probs", {})
    all_probs: Dict[str, float] = {}
    
    if isinstance(raw_probs, dict):
        for label in EMOTION_LABELS:
            val = raw_probs.get(label, raw_probs.get(label.capitalize(), 0.0))
            try:
                all_probs[label] = max(0.0, min(1.0, float(val)))
            except (ValueError, TypeError):
                all_probs[label] = 0.0
    
    # If all_probs is missing or empty, construct sensible distribution
    total_p = sum(all_probs.values())
    if total_p <= 0.0:
        remainder = (1.0 - confidence) / max(1, (len(EMOTION_LABELS) - 1))
        for label in EMOTION_LABELS:
            all_probs[label] = confidence if label == emotion else remainder
    else:
        # Re-normalize so sum is approx 1.0
        all_probs = {k: round(v / total_p, 4) for k, v in all_probs.items()}
    
    # Ensure sorted by confidence descending
    sorted_probs = {k: v for k, v in sorted(all_probs.items(), key=lambda item: item[1], reverse=True)}

    # 4. Normalize bbox [x, y, w, h]
    raw_bbox = raw_data.get("bbox", None)
    bbox: List[int] = [0, 0, img_w, img_h]
    if isinstance(raw_bbox, (list, tuple)) and len(raw_bbox) == 4:
        try:
            bx, by, bw, bh = [int(v) for v in raw_bbox]
            bx = max(0, min(img_w - 1, bx))
            by = max(0, min(img_h - 1, by))
            bw = max(1, min(img_w - bx, bw))
            bh = max(1, min(img_h - by, bh))
            bbox = [bx, by, bw, bh]
        except (ValueError, TypeError):
            bbox = [0, 0, img_w, img_h]

    return {
        "emotion": emotion,
        "confidence": confidence,
        "all_probs": sorted_probs,
        "bbox": bbox
    }

def predict_emotion(bgr_image: np.ndarray) -> Dict[str, Any]:
    """
    Sends an image frame to Groq's Vision model (llama-3.2-11b-vision-preview)
    to classify the facial emotion and returns structured JSON for the frontend.
    """
    if bgr_image is None or bgr_image.size == 0:
        return {
            "emotion": "no_face",
            "confidence": 0.0,
            "all_probs": {l: 0.0 for l in EMOTION_LABELS},
            "bbox": [0, 0, 0, 0]
        }

    client = get_groq_client()
    if not client:
        raise RuntimeError("GROQ_API_KEY environment variable is not set. Please set your Groq API key.")

    img_h, img_w = bgr_image.shape[:2]
    
    # Downscale if image is excessively large for faster inference transfer
    max_dim = 1024
    if max(img_h, img_w) > max_dim:
        scale = max_dim / max(img_h, img_w)
        bgr_image = cv2.resize(bgr_image, (int(img_w * scale), int(img_h * scale)), interpolation=cv2.INTER_AREA)

    base64_image = encode_bgr_to_base64_jpeg(bgr_image, quality=85)

    system_prompt = (
        "You are an expert Facial Emotion Recognition (FER) system. "
        "Analyze the face in the image and classify the emotion into one of: "
        "['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']. "
        "You must output ONLY a valid JSON object."
    )
    user_prompt = (
        f"Classify the facial emotion in this image ({img_w}x{img_h}). "
        "Respond with a JSON object containing keys: 'emotion', 'confidence', 'all_probs', and 'bbox'. "
        "Example JSON format:\n"
        "{\n"
        '  "emotion": "sad",\n'
        '  "confidence": 0.95,\n'
        '  "all_probs": {"angry": 0.01, "disgust": 0.0, "fear": 0.01, "happy": 0.0, "neutral": 0.01, "sad": 0.95, "surprise": 0.02},\n'
        f'  "bbox": [0, 0, {img_w}, {img_h}]\n'
        "}"
    )

    last_err = None
    for model_name in GROQ_MODELS:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=300
            )
            
            response_text = response.choices[0].message.content or "{}"
            parsed_json = json.loads(response_text)
            return normalize_emotion_response(parsed_json, bgr_image.shape)
        except Exception as err:
            last_err = err
            print(f"[Groq Vision] Model {model_name} error: {err}. Trying fallback...")
            continue
            
    print(f"[Groq Vision] All models failed. Last error: {last_err}")
    raise last_err

def predict_emotion_from_path(image_path: str) -> Dict[str, Any]:
    """
    Reads an image from disk and runs emotion prediction via Groq Vision API.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    bgr_image = cv2.imread(image_path)
    if bgr_image is None:
        raise ValueError(f"Could not read image at {image_path}")
    return predict_emotion(bgr_image)
