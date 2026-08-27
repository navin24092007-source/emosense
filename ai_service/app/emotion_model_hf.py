import os
import cv2
import torch
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

# Global model loading at import time (not per-request)
MODEL_NAME = "dima806/facial_emotions_image_detection"
print(f"Loading {MODEL_NAME}...")
processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = AutoModelForImageClassification.from_pretrained(MODEL_NAME)
model.eval()
print(f"{MODEL_NAME} loaded.")

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def detect_face(bgr_image):
    gray = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    if len(faces) == 0:
        return None
    
    # Return largest face
    faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
    return faces[0]

def predict_emotion(bgr_image):
    face_bbox = detect_face(bgr_image)
    
    if face_bbox is None:
        return {
            "emotion": "neutral",
            "confidence": 0.0,
            "all_probs": {},
            "bbox": None
        }
        
    x, y, w, h = face_bbox
    # Expand crop slightly
    padding_x = int(w * 0.1)
    padding_y = int(h * 0.1)
    
    y1 = max(0, y - padding_y)
    y2 = min(bgr_image.shape[0], y + h + padding_y)
    x1 = max(0, x - padding_x)
    x2 = min(bgr_image.shape[1], x + w + padding_x)
    
    face_crop = bgr_image[y1:y2, x1:x2]
    
    # Convert BGR to RGB for PIL
    rgb_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(rgb_face)
    
    inputs = processor(images=pil_image, return_tensors="pt")
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]
    
    # The model labels
    id2label = model.config.id2label
    
    results = {}
    for i, prob in enumerate(probs):
        label = id2label[i].lower()
        results[label] = prob.item()
        
    # Sort dict
    sorted_results = {k: v for k, v in sorted(results.items(), key=lambda item: item[1], reverse=True)}
    top_emotion = list(sorted_results.keys())[0]
    top_confidence = sorted_results[top_emotion]
    
    return {
        "emotion": top_emotion,
        "confidence": top_confidence,
        "all_probs": sorted_results,
        "bbox": [int(x), int(y), int(w), int(h)]
    }

def predict_emotion_from_path(image_path):
    bgr_image = cv2.imread(image_path)
    if bgr_image is None:
        raise ValueError(f"Could not read image at {image_path}")
    return predict_emotion(bgr_image)
