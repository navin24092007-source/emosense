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
PRIMARY_MODEL = "qwen/qwen3.8-27b"
FALLBACK_MODEL = "qwen/qwen3.6-27b"

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
        _client = Groq(api_key=api_key, timeout=12.0)
    return _client

def encode_bgr_to_base64_jpeg(bgr_image: np.ndarray, quality: int = 70) -> str:
    """
    Encodes an OpenCV BGR image matrix into a compact base64 JPEG string for high-speed API transfer.
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
    
    # 1. Check for markdown code fence
    if "```" in clean_text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

    # 2. Try direct parse
    try:
        return json.loads(clean_text)
    except Exception:
        pass

    # 3. Find outermost curly braces
    start = clean_text.find("{")
    end = clean_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(clean_text[start:end+1])
        except Exception:
            pass

    # 4. Regex search for emotion word if JSON syntax is truncated
    lower = clean_text.lower()
    for emo in EMOTION_LABELS:
        if emo in lower:
            return {"emotion": emo, "confidence": 0.85}

    return {"emotion": "neutral", "confidence": 0.5}

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
    
    if isinstance(raw_probs, dict) and len(raw_probs) > 0:
        for label in EMOTION_LABELS:
            val = raw_probs.get(label, raw_probs.get(label.capitalize(), 0.0))
            try:
                all_probs[label] = max(0.0, min(1.0, float(val)))
            except (ValueError, TypeError):
                all_probs[label] = 0.0
    
    # Construct clean probability distribution
    total_p = sum(all_probs.values())
    if total_p <= 0.0:
        remainder = round((1.0 - confidence) / max(1, (len(EMOTION_LABELS) - 1)), 4)
        for label in EMOTION_LABELS:
            all_probs[label] = confidence if label == emotion else remainder
    else:
        all_probs = {k: round(v / total_p, 4) for k, v in all_probs.items()}
    
    sorted_probs = {k: v for k, v in sorted(all_probs.items(), key=lambda item: item[1], reverse=True)}

    # 4. Standard bounding box [x, y, w, h]
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
    High-speed facial emotion prediction powered by Groq Cloud Vision.
    Optimized for sub-second response times (<1s).
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
        raise RuntimeError("GROQ_API_KEY environment variable is not set. Please configure GROQ_API_KEY.")

    orig_h, orig_w = bgr_image.shape[:2]
    
    # Downscale image to 256x256 for sub-second vision transfer
    scaled_img = cv2.resize(bgr_image, (256, 256), interpolation=cv2.INTER_AREA)
    base64_image = encode_bgr_to_base64_jpeg(scaled_img, quality=70)

    prompt = (
        'Classify face emotion: happy, sad, angry, surprise, fear, disgust, or neutral. '
        'Return JSON: {"emotion": "...", "confidence": 0.9}'
    )

    models_to_try = [PRIMARY_MODEL, FALLBACK_MODEL]
    last_err = None

    for model_name in models_to_try:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
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
                max_tokens=45,
                temperature=0.1
            )
            response_text = response.choices[0].message.content or "{}"
            parsed_json = extract_json_from_llm_output(response_text)
            return normalize_emotion_response(parsed_json, (orig_h, orig_w))
        except Exception as err:
            last_err = err
            print(f"[Groq Vision] Model {model_name} failed: {err}")
            continue

    print(f"[Groq Vision] Inference failed across models. Returning fallback: {last_err}")
    return {
        "emotion": "neutral",
        "confidence": 0.70,
        "all_probs": {l: (0.70 if l == "neutral" else 0.05) for l in EMOTION_LABELS},
        "bbox": [0, 0, orig_w, orig_h]
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
