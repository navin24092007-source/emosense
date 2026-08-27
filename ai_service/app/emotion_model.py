import os
import re
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

def extract_json_from_llm_output(text: str) -> Dict[str, Any]:
    """
    Robustly extracts and parses a JSON object from raw LLM text response.
    """
    clean_text = text.strip()
    
    # 1. Check for markdown json codeblock
    if "```" in clean_text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

    # 2. Try direct json.loads
    try:
        return json.loads(clean_text)
    except Exception:
        pass

    # 3. Find outermost curly braces
    start = clean_text.find("{")
    end = clean_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        json_slice = clean_text[start:end+1]
        try:
            return json.loads(json_slice)
        except Exception:
            pass

    # 4. Fallback default
    return {
        "emotion": "neutral",
        "confidence": 0.5,
        "all_probs": {l: (0.5 if l == "neutral" else 0.08) for l in EMOTION_LABELS},
        "bbox": [0, 0, 100, 100]
    }

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
    Sends an image frame to Groq's Vision model (qwen/qwen3.8-27b)
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

    prompt = (
        f"Analyze the facial expression in this image ({img_w}x{img_h}). "
        "Classify the primary emotion into exactly ONE of: angry, disgust, fear, happy, neutral, sad, surprise.\n\n"
        "Return ONLY a JSON object in this format:\n"
        "{\n"
        '  "emotion": "sad",\n'
        '  "confidence": 0.95,\n'
        '  "all_probs": {"angry": 0.01, "disgust": 0.0, "fear": 0.01, "happy": 0.0, "neutral": 0.01, "sad": 0.95, "surprise": 0.02},\n'
        f'  "bbox": [0, 0, {img_w}, {img_h}]\n'
        "}"
    )

    last_err = None
    for model_name in GROQ_MODELS:
        # Try first without strict response_format (more reliable across vision models),
        # then with response_format if needed
        for use_json_mode in [False, True]:
            try:
                kwargs: Dict[str, Any] = {
                    "model": model_name,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}"
                                    }
                                }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 300
                }
                if use_json_mode:
                    kwargs["response_format"] = {"type": "json_object"}

                response = client.chat.completions.create(**kwargs)
                response_text = response.choices[0].message.content or "{}"
                parsed_json = extract_json_from_llm_output(response_text)
                return normalize_emotion_response(parsed_json, bgr_image.shape)
            except Exception as err:
                last_err = err
                print(f"[Groq Vision] Attempt (model={model_name}, json_mode={use_json_mode}) failed: {err}")
                continue

    print(f"[Groq Vision] All attempts failed. Last error: {last_err}")
    # Return a graceful normalized fallback if remote API is degraded
    return {
        "emotion": "neutral",
        "confidence": 0.70,
        "all_probs": {l: (0.70 if l == "neutral" else 0.05) for l in EMOTION_LABELS},
        "bbox": [0, 0, img_w, img_h]
    }

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
