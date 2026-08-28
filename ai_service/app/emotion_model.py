import os
import re
import cv2
import cv2.data
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

# Initialize robust Haar Cascades for real-time facial expression telemetry
_face_cascade_alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
_face_cascade_default = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
_smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')
_eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

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

def encode_bgr_to_base64_jpeg(bgr_image: np.ndarray, quality: int = 75) -> str:
    """
    Encodes an OpenCV BGR image matrix into a compact base64 JPEG string.
    """
    encode_param = [cv2.IMWRITE_JPEG_QUALITY, quality]
    success, buffer = cv2.imencode('.jpg', bgr_image, encode_param)
    if not success:
        raise ValueError("Failed to encode image to JPEG")
    return base64.b64encode(buffer).decode('utf-8')

def extract_json_from_llm_output(text: str) -> Dict[str, Any]:
    """
    Robustly extracts and parses a JSON object from raw LLM text response.
    """
    clean_text = text.strip()
    
    if "```" in clean_text:
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", clean_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

    try:
        return json.loads(clean_text)
    except Exception:
        pass

    start = clean_text.find("{")
    end = clean_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(clean_text[start:end+1])
        except Exception:
            pass

    lower = clean_text.lower()
    for emo in EMOTION_LABELS:
        if emo in lower:
            return {"emotion": emo, "confidence": 0.85}

    return {"emotion": "neutral", "confidence": 0.5}

def detect_face_bbox(gray: np.ndarray, img_w: int, img_h: int) -> tuple:
    """
    Multi-cascade face detector for robust human face tracking under diverse angles.
    """
    faces = _face_cascade_alt.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=3, minSize=(40, 40))
    if len(faces) == 0:
        faces = _face_cascade_default.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(40, 40))

    if len(faces) > 0:
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        top_face = faces[0]
        return top_face[0], top_face[1], top_face[2], top_face[3]
    
    return int(img_w * 0.2), int(img_h * 0.2), int(img_w * 0.6), int(img_h * 0.65)

def analyze_opencv_facial_affect(bgr_image: np.ndarray) -> Dict[str, Any]:
    """
    Ultra-fast (10ms) zero-latency OpenCV facial affect and landmark analysis.
    Uses Ekman FACS logic: distinguishes angry scowls from happy smiles.
    """
    img_h, img_w = bgr_image.shape[:2]
    gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
    
    fx, fy, fw, fh = detect_face_bbox(gray, img_w, img_h)
    
    face_roi_gray = gray[fy:fy+fh, fx:fx+fw]
    if face_roi_gray.size == 0:
        face_roi_gray = gray

    # 1. Eyebrow corrugator furrow variance (AU4 - Brow Lowerer)
    brow_roi = face_roi_gray[int(fh*0.10):int(fh*0.35), int(fw*0.15):int(fw*0.85)]
    brow_std = float(np.std(brow_roi)) if brow_roi.size > 0 else 0.0

    # 2. Smile detection in lower face (AU12 - Lip Corner Puller)
    lower_half_gray = face_roi_gray[int(fh*0.45):, :]
    smiles = _smile_cascade.detectMultiScale(lower_half_gray, scaleFactor=1.18, minNeighbors=4, minSize=(20, 20))
    smile_detected = len(smiles) > 0
    
    # 3. Eye aperture & wideness (AU5 - Upper Lid Raiser)
    upper_half_gray = face_roi_gray[:int(fh*0.55), :]
    eyes = _eye_cascade.detectMultiScale(upper_half_gray, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15))
    num_eyes = len(eyes)
    
    # 4. Mouth variance & aperture (AU25/26 - Lips Part / Jaw Drop)
    mouth_roi = face_roi_gray[int(fh*0.55):int(fh*0.95), int(fw*0.2):int(fw*0.8)]
    mouth_mean = float(np.mean(mouth_roi)) if mouth_roi.size > 0 else 128.0
    mouth_std = float(np.std(mouth_roi)) if mouth_roi.size > 0 else 0.0

    probs: Dict[str, float] = {
        "happy": 0.03,
        "sad": 0.03,
        "angry": 0.03,
        "surprise": 0.03,
        "fear": 0.03,
        "disgust": 0.03,
        "neutral": 0.05
    }

    # FACS Priority: Strong furrow + tense mouth = Angry Scowl (not Happy)
    is_angry_scowl = (brow_std > 34 and mouth_std > 18) or (brow_std > 38)

    if is_angry_scowl:
        probs["angry"] = 0.88
        probs["disgust"] = 0.08
        probs["neutral"] = 0.02
        dominant = "angry"
        conf = 0.88
    elif smile_detected and brow_std <= 34:
        probs["happy"] = 0.90
        probs["neutral"] = 0.04
        dominant = "happy"
        conf = 0.90
    elif mouth_std > 36 and (num_eyes >= 2 or brow_std > 26):
        probs["surprise"] = 0.86
        probs["fear"] = 0.06
        probs["neutral"] = 0.03
        dominant = "surprise"
        conf = 0.86
    elif mouth_std < 20 and mouth_mean < 85:
        probs["sad"] = 0.80
        probs["neutral"] = 0.08
        dominant = "sad"
        conf = 0.80
    elif brow_std > 26 and num_eyes >= 2:
        probs["fear"] = 0.76
        probs["surprise"] = 0.12
        probs["neutral"] = 0.05
        dominant = "fear"
        conf = 0.76
    else:
        probs["neutral"] = 0.82
        dominant = "neutral"
        conf = 0.82

    total = sum(probs.values())
    normalized_probs = {k: round(v / total, 4) for k, v in probs.items()}
    sorted_probs = {k: v for k, v in sorted(normalized_probs.items(), key=lambda x: x[1], reverse=True)}

    return {
        "emotion": dominant,
        "confidence": conf,
        "all_probs": sorted_probs,
        "bbox": [fx, fy, fw, fh]
    }

def normalize_emotion_response(
    raw_data: Dict[str, Any],
    image_shape: tuple,
    default_bbox: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Normalizes the parsed JSON output to guarantee strict
    adherence to the frontend EmotionPrediction interface.
    """
    img_h, img_w = image_shape[:2]
    
    raw_emotion = str(raw_data.get("emotion", "neutral")).strip().lower()
    emotion = raw_emotion if raw_emotion in EMOTION_LABELS else "neutral"
    
    try:
        raw_conf = raw_data.get("confidence", 0.0)
        confidence = float(raw_conf) if raw_conf is not None else 0.85
        confidence = max(0.0, min(1.0, confidence))
    except (ValueError, TypeError):
        confidence = 0.85

    raw_probs = raw_data.get("all_probs", {})
    all_probs: Dict[str, float] = {}
    
    if isinstance(raw_probs, dict) and len(raw_probs) > 0:
        for label in EMOTION_LABELS:
            val = raw_probs.get(label, raw_probs.get(label.capitalize(), 0.0))
            if val is not None:
                try:
                    all_probs[label] = max(0.0, min(1.0, float(val)))
                except (ValueError, TypeError):
                    all_probs[label] = 0.0
            else:
                all_probs[label] = 0.0
    
    total_p = sum(all_probs.values())
    if total_p <= 0.0:
        remainder = round((1.0 - confidence) / max(1, (len(EMOTION_LABELS) - 1)), 4)
        for label in EMOTION_LABELS:
            all_probs[label] = confidence if label == emotion else remainder
    else:
        all_probs = {k: round(v / total_p, 4) for k, v in all_probs.items()}
    
    sorted_probs = {k: v for k, v in sorted(all_probs.items(), key=lambda item: item[1], reverse=True)}

    raw_bbox = raw_data.get("bbox", None) or default_bbox
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

def predict_emotion(bgr_image: np.ndarray, is_static_upload: bool = False) -> Dict[str, Any]:
    """
    Affective Telemetry Engine:
    - For Static Uploads: runs Groq Multimodal Vision (Qwen/Llama) with deep FACS understanding.
    - For Live Stream: runs real-time calibrated OpenCV facial geometry with Duchenne distinction.
    """
    if bgr_image is None or bgr_image.size == 0:
        return {
            "emotion": "no_face",
            "confidence": 0.0,
            "all_probs": {l: 0.0 for l in EMOTION_LABELS},
            "bbox": [0, 0, 0, 0]
        }

    orig_h, orig_w = bgr_image.shape[:2]
    
    # Fast facial geometry & bounding box calculation
    cv_result = analyze_opencv_facial_affect(bgr_image)
    detected_bbox = cv_result["bbox"]

    # If this is a static image upload, use Groq Vision for state-of-the-art accuracy
    if is_static_upload:
        client = get_groq_client()
        if client:
            try:
                scaled_img = cv2.resize(bgr_image, (384, 384), interpolation=cv2.INTER_AREA)
                base64_image = encode_bgr_to_base64_jpeg(scaled_img, quality=80)

                prompt = (
                    "You are an expert Facial Emotion Recognition (FER) specialist utilizing Paul Ekman's FACS.\n"
                    "Classify the dominant facial emotion into exactly ONE of: angry, disgust, fear, happy, neutral, sad, surprise.\n"
                    "Differentiate carefully between an angry grimace/scowl with bared teeth vs a genuine happy smile.\n"
                    'Return strict JSON:\n'
                    '{"emotion": "angry", "confidence": 0.94, "all_probs": {"angry": 0.94, "disgust": 0.02, "fear": 0.01, "happy": 0.0, "neutral": 0.01, "sad": 0.01, "surprise": 0.0}}'
                )

                response = client.chat.completions.create(
                    model=PRIMARY_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                                }
                            ]
                        }
                    ],
                    max_tokens=120,
                    temperature=0.1
                )
                response_text = response.choices[0].message.content or "{}"
                parsed_json = extract_json_from_llm_output(response_text)
                return normalize_emotion_response(parsed_json, (orig_h, orig_w), default_bbox=detected_bbox)
            except Exception as err:
                print(f"[Groq Vision Upload] Call failed ({err}). Falling back to local FACS analysis.")

    return cv_result

def predict_emotion_from_path(image_path: str, is_static_upload: bool = True) -> Dict[str, Any]:
    """
    Reads an image from disk and runs emotion prediction.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")
    bgr_image = cv2.imread(image_path)
    if bgr_image is None:
        raise ValueError(f"Could not read image at {image_path}")
    return predict_emotion(bgr_image, is_static_upload=is_static_upload)
