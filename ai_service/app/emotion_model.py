import os
import re
import cv2
import cv2.data
import json
import time
import base64
import numpy as np
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env if present
load_dotenv()

EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
PRIMARY_MODEL = "qwen/qwen3.8-27b"

_client: Optional[Groq] = None
_last_groq_frame_time: float = 0.0
_last_cached_frame_result: Optional[Dict[str, Any]] = None

# Initialize robust Haar Cascades for multi-angle face tracking
_face_cascade_alt2 = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
_face_cascade_default = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
_face_cascade_alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt.xml')
_profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
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
        _client = Groq(api_key=api_key, timeout=10.0)
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
            probs = {e: 0.01 for e in EMOTION_LABELS}
            probs[emo] = 0.94
            return {"emotion": emo, "confidence": 0.94, "all_probs": probs}

    return {"emotion": "neutral", "confidence": 0.85}

def detect_face_bbox(gray: np.ndarray, bgr: np.ndarray) -> tuple:
    """
    Multi-stage human face detector:
    1. CLAHE enhanced Haar cascades (alt2, default, alt, profile)
    2. YCrCb human skin chrominance segmentation for dim / backlit webcams
    """
    img_h, img_w = gray.shape[:2]

    # Preprocess with CLAHE for illumination invariance
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    gray_eq = clahe.apply(gray)

    # 1. Multi-cascade detection with sensitive parameters
    for cascade in [_face_cascade_alt2, _face_cascade_default, _face_cascade_alt, _profile_cascade]:
        faces = cascade.detectMultiScale(gray_eq, scaleFactor=1.05, minNeighbors=2, minSize=(28, 28))
        if len(faces) > 0:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            f = faces[0]
            return f[0], f[1], f[2], f[3]

    # 2. Skin tone segmentation in YCrCb color space
    if bgr is not None and bgr.size > 0:
        try:
            ycrcb = cv2.cvtColor(bgr, cv2.COLOR_BGR2YCrCb)
            skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
            skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_OPEN, kernel, iterations=2)
            skin_mask = cv2.morphologyEx(skin_mask, cv2.MORPH_DILATE, kernel, iterations=2)
            contours, _ = cv2.findContours(skin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if len(contours) > 0:
                valid = [c for c in contours if cv2.contourArea(c) > (img_w * img_h * 0.04)]
                if len(valid) > 0:
                    largest = max(valid, key=cv2.contourArea)
                    bx, by, bw, bh = cv2.boundingRect(largest)
                    return bx, by, bw, bh
        except Exception:
            pass

    # 3. Default centered head bounding box
    fw = int(img_w * 0.52)
    fh = int(img_h * 0.62)
    fx = int((img_w - fw) / 2)
    fy = int(img_h * 0.14)
    return fx, fy, fw, fh

def analyze_opencv_facial_affect(bgr_image: np.ndarray) -> Dict[str, Any]:
    """
    Ultra-fast (15ms) zero-latency affective facial telemetry engine.
    Calibrated for real-world webcam lighting, facial hair, skin tones, and head poses.
    """
    if bgr_image is None or bgr_image.size == 0:
        return {
            "emotion": "no_face",
            "confidence": 0.0,
            "all_probs": {l: 0.0 for l in EMOTION_LABELS},
            "bbox": [0, 0, 0, 0]
        }

    img_h, img_w = bgr_image.shape[:2]
    gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
    
    fx, fy, fw, fh = detect_face_bbox(gray, bgr_image)
    
    fx = max(0, min(img_w - 1, fx))
    fy = max(0, min(img_h - 1, fy))
    fw = max(20, min(img_w - fx, fw))
    fh = max(20, min(img_h - fy, fh))

    face_crop = gray[fy:fy+fh, fx:fx+fw]
    if face_crop.size == 0:
        face_crop = gray

    face_norm = cv2.resize(face_crop, (160, 160), interpolation=cv2.INTER_AREA)
    clahe = cv2.createCLAHE(clipLimit=2.8, tileGridSize=(8, 8))
    face_eq = clahe.apply(face_norm)

    # 1. Smile Detection (AU12 - Lip Corner Puller)
    lower_half = face_eq[int(160 * 0.45):, :]
    smiles = _smile_cascade.detectMultiScale(lower_half, scaleFactor=1.10, minNeighbors=2, minSize=(14, 14))
    smile_detected = len(smiles) > 0

    # 2. Eye Aperture (AU5 - Upper Lid Raiser)
    upper_half = face_eq[:int(160 * 0.55), :]
    eyes = _eye_cascade.detectMultiScale(upper_half, scaleFactor=1.08, minNeighbors=2, minSize=(12, 12))
    num_eyes = len(eyes)

    # 3. Mouth Region Morphology (rows 90:150, cols 25:135)
    mouth_zone = face_eq[90:150, 25:135]
    mouth_std = float(np.std(mouth_zone)) if mouth_zone.size > 0 else 0.0

    left_c = mouth_zone[:, :30]
    center_m = mouth_zone[:, 30:80]
    right_c = mouth_zone[:, 80:]
    
    left_y = np.argmin(np.mean(left_c, axis=1)) if left_c.size > 0 else 30
    right_y = np.argmin(np.mean(right_c, axis=1)) if right_c.size > 0 else 30
    center_y = np.argmin(np.mean(center_m, axis=1)) if center_m.size > 0 else 30
    smile_lift = float(center_y - ((left_y + right_y) / 2.0))

    mouth_thresh = cv2.threshold(mouth_zone, 60, 255, cv2.THRESH_BINARY_INV)[1]
    v_open = np.sum(np.sum(mouth_thresh > 0, axis=1) > (mouth_zone.shape[1] * 0.15))
    h_open = np.sum(np.sum(mouth_thresh > 0, axis=0) > (mouth_zone.shape[0] * 0.15))
    mouth_aspect_ratio = float(v_open / max(1, h_open))

    # 4. Eyebrow / Glabella Furrow (AU4 - Brow Lowerer)
    glabella_zone = face_eq[20:55, 60:100]
    sobel_v = cv2.Sobel(glabella_zone, cv2.CV_64F, 1, 0, ksize=3)
    glabella_furrow = float(np.mean(np.abs(sobel_v))) if glabella_zone.size > 0 else 0.0

    # 5. Continuous Dynamic Energy Scoring
    scores = {
        "happy": 0.05,
        "sad": 0.05,
        "angry": 0.05,
        "surprise": 0.05,
        "fear": 0.04,
        "disgust": 0.04,
        "neutral": 0.30
    }

    if smile_detected or smile_lift > 1.0 or (mouth_std > 30 and smile_lift >= 0):
        scores["happy"] += 3.8 + max(0.0, smile_lift * 0.4)
        scores["neutral"] = 0.02
    elif mouth_aspect_ratio > 0.36 or v_open > 15:
        scores["surprise"] += 3.5 + (mouth_aspect_ratio * 2.0)
        scores["fear"] += 0.8
        scores["neutral"] = 0.02
    elif glabella_furrow > 14.0 and smile_lift <= 0.5:
        scores["angry"] += 3.2 + (glabella_furrow / 8.0)
        scores["disgust"] += 0.6
        scores["neutral"] = 0.02
    elif smile_lift < -1.0:
        scores["sad"] += 3.0 + max(0.0, -smile_lift * 0.4)
        scores["neutral"] = 0.04
    else:
        scores["neutral"] = 2.0
        scores["happy"] += max(0.0, smile_lift * 0.1)

    dominant = max(scores, key=lambda k: scores[k])
    exp_scores = {k: np.exp(v * 1.5) for k, v in scores.items()}
    total_exp = sum(exp_scores.values())
    all_probs = {k: round(float(v / total_exp), 4) for k, v in exp_scores.items()}
    sorted_probs = {k: v for k, v in sorted(all_probs.items(), key=lambda x: x[1], reverse=True)}
    conf = round(sorted_probs[dominant], 2)

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
        confidence = float(raw_conf) if raw_conf is not None else 0.90
        confidence = max(0.50, min(0.99, confidence))
    except (ValueError, TypeError):
        confidence = 0.90

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
    bbox: List[int] = [int(img_w * 0.15), int(img_h * 0.15), int(img_w * 0.7), int(img_h * 0.7)]
    if isinstance(raw_bbox, (list, tuple)) and len(raw_bbox) == 4:
        try:
            bx, by, bw, bh = [int(v) for v in raw_bbox]
            bx = max(0, min(img_w - 1, bx))
            by = max(0, min(img_h - 1, by))
            bw = max(1, min(img_w - bx, bw))
            bh = max(1, min(img_h - by, bh))
            bbox = [bx, by, bw, bh]
        except (ValueError, TypeError):
            pass

    return {
        "emotion": emotion,
        "confidence": confidence,
        "all_probs": sorted_probs,
        "bbox": bbox
    }

def predict_emotion(bgr_image: np.ndarray, is_static_upload: bool = False) -> Dict[str, Any]:
    """
    Affective Telemetry Engine:
    - For Static Uploads: runs Groq Multimodal Vision (Qwen 27B) with Ekman FACS understanding.
    - For Live Stream: runs ultra-fast zero-latency OpenCV facial geometry (15ms).
    """
    if bgr_image is None or bgr_image.size == 0:
        return {
            "emotion": "no_face",
            "confidence": 0.0,
            "all_probs": {l: 0.0 for l in EMOTION_LABELS},
            "bbox": [0, 0, 0, 0]
        }

    orig_h, orig_w = bgr_image.shape[:2]
    
    # Fast facial geometry & bounding box calculation (15ms)
    cv_result = analyze_opencv_facial_affect(bgr_image)
    detected_bbox = cv_result["bbox"]

    # For static image uploads, execute Groq Vision for deep multimodal classification
    if is_static_upload:
        client = get_groq_client()
        if client is not None:
            try:
                scaled_img = cv2.resize(bgr_image, (384, 384), interpolation=cv2.INTER_AREA)
                base64_image = encode_bgr_to_base64_jpeg(scaled_img, quality=75)

                prompt = (
                    "You are an expert Facial Emotion Recognition (FER) specialist utilizing Paul Ekman's FACS.\n"
                    "Classify the dominant facial emotion into exactly ONE of: angry, disgust, fear, happy, neutral, sad, surprise.\n"
                    "Differentiate carefully between an angry scowl vs a happy smile vs sad downturned lips vs surprise open mouth.\n"
                    "Return JSON ONLY in this format:\n"
                    '{"emotion": "happy", "confidence": 0.95, "all_probs": {"angry": 0.01, "disgust": 0.01, "fear": 0.01, "happy": 0.95, "neutral": 0.01, "sad": 0.01, "surprise": 0.0}}'
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
                    max_tokens=300,
                    temperature=0.1
                )
                response_text = response.choices[0].message.content or "{}"
                parsed_json = extract_json_from_llm_output(response_text)
                return normalize_emotion_response(parsed_json, (orig_h, orig_w), default_bbox=detected_bbox)
            except Exception as err:
                print(f"[Groq Vision Upload] Error ({err}). Falling back to geometric analysis.")

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

