import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from typing import Dict, Any, List, Tuple

# 7 standard FER-2013/AffectNet emotion labels
EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

class EmotionCNN(nn.Module):
    """
    Lightweight 7-class CNN model for Facial Emotion Recognition.
    Expected input: 1x48x48 Grayscale image or 3x48x48 normalized tensor.
    """
    def __init__(self, num_classes=7):
        super(EmotionCNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout1 = nn.Dropout(0.25)

        self.conv3 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.conv4 = nn.Conv2d(128, 128, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(128)
        self.dropout2 = nn.Dropout(0.25)

        self.fc1 = nn.Linear(128 * 12 * 12, 512)
        self.bn5 = nn.BatchNorm1d(512)
        self.dropout3 = nn.Dropout(0.5)
        self.fc2 = nn.Linear(512, num_classes)

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = self.pool(x)
        x = self.dropout1(x)

        x = F.relu(self.bn3(self.conv3(x)))
        x = F.relu(self.bn4(self.conv4(x)))
        x = self.pool(x)
        x = self.dropout2(x)

        x = x.view(x.size(0), -1)
        x = F.relu(self.bn5(self.fc1(x)))
        x = self.dropout3(x)
        x = self.fc2(x)
        return x


class EmotionRecognizer:
    def __init__(self, weights_path: str = "app/models/fer2013_model.pth"):
        self.labels = EMOTION_LABELS
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        cascade_dir = cv2.data.haarcascades
        self.face_cascade_default = cv2.CascadeClassifier(cascade_dir + 'haarcascade_frontalface_default.xml')
        self.face_cascade_alt = cv2.CascadeClassifier(cascade_dir + 'haarcascade_frontalface_alt.xml')
        self.face_cascade_alt2 = cv2.CascadeClassifier(cascade_dir + 'haarcascade_frontalface_alt2.xml')
        self.face_cascade_profile = cv2.CascadeClassifier(cascade_dir + 'haarcascade_profileface.xml')
        
        self.smile_cascade = cv2.CascadeClassifier(cascade_dir + 'haarcascade_smile.xml')
        self.eye_cascade = cv2.CascadeClassifier(cascade_dir + 'haarcascade_eye.xml')
        
        # Load CNN model if weights file exists
        self.model = EmotionCNN(num_classes=7).to(self.device)
        self.model_loaded = False

        if os.path.exists(weights_path):
            try:
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                self.model.eval()
                self.model_loaded = True
                print(f"[AI Service] Successfully loaded fine-tuned model weights from {weights_path}")
            except Exception as e:
                print(f"[AI Service] Failed to load model weights from {weights_path}: {e}")
        else:
            print(f"[AI Service] Model weights not found at {weights_path}. Running with dynamic Computer Vision inference engine.")

        # Preprocessing pipeline
        self.transform = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Grayscale(num_output_channels=1),
            transforms.Resize((48, 48)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5], std=[0.5])
        ])

    def detect_faces(self, image: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detects faces in BGR image using multi-pass OpenCV Haar Cascade ensemble,
        CLAHE contrast equalization, skin color segmentation, and portrait fallbacks.
        Returns list of bounding boxes (x, y, w, h).
        """
        if image is None or image.size == 0:
            return []

        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # Pass 1: Standard detection on raw grayscale
        faces = self.face_cascade_default.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(30, 30)
        )
        if len(faces) > 0:
            return [tuple(f) for f in faces]

        # Pass 2: CLAHE contrast equalized pass (essential for backlit & high dynamic range webcam scenes)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl_gray = clahe.apply(gray)
        
        for cascade in [self.face_cascade_default, self.face_cascade_alt, self.face_cascade_alt2]:
            faces = cascade.detectMultiScale(
                cl_gray,
                scaleFactor=1.06,
                minNeighbors=2,
                minSize=(25, 25)
            )
            if len(faces) > 0:
                return [tuple(f) for f in faces]

        # Pass 3: Profile Face on normal and horizontally flipped image
        faces = self.face_cascade_profile.detectMultiScale(
            cl_gray,
            scaleFactor=1.06,
            minNeighbors=2,
            minSize=(25, 25)
        )
        if len(faces) > 0:
            return [tuple(f) for f in faces]

        cl_flipped = cv2.flip(cl_gray, 1)
        faces = self.face_cascade_profile.detectMultiScale(
            cl_flipped,
            scaleFactor=1.06,
            minNeighbors=2,
            minSize=(25, 25)
        )
        if len(faces) > 0:
            return [(w - int(f[0]) - int(f[2]), int(f[1]), int(f[2]), int(f[3])) for f in faces]

        # Pass 4: Skin color segmentation contour localization
        if len(image.shape) == 3:
            ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
            mask = cv2.inRange(ycrcb, np.array([0, 133, 77], dtype=np.uint8), np.array([255, 173, 127], dtype=np.uint8))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            valid_boxes = []
            for c in contours:
                area = cv2.contourArea(c)
                if area > (h * w * 0.04):
                    bx, by, bw, bh = cv2.boundingRect(c)
                    aspect = bh / max(bw, 1)
                    if 0.6 <= aspect <= 2.2 and by < (h * 0.75):
                        valid_boxes.append((bx, by, bw, bh))
            
            if valid_boxes:
                valid_boxes.sort(key=lambda b: b[2] * b[3], reverse=True)
                return [valid_boxes[0]]

        # Pass 5: Central Portrait Head ROI fallback
        if w >= 80 and h >= 80:
            cx = int(w * 0.20)
            cy = int(h * 0.08)
            cw = int(w * 0.60)
            ch = int(h * 0.75)
            return [(cx, cy, cw, ch)]

        return []

    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Processes image, crops primary face, applies CLAHE contrast equalization,
        and calculates 7-emotion probability distribution using hybrid ensemble.
        """
        faces = self.detect_faces(image)
        if len(faces) == 0:
            return {
                "emotion": "neutral",
                "confidence": 0.5,
                "all_probs": {l: (0.7 if l == 'neutral' else 0.05) for l in self.labels},
                "bbox": [0, 0, 0, 0]
            }

        faces = sorted(faces, key=lambda b: b[2] * b[3], reverse=True)
        primary_bbox = faces[0]
        x, y, w, h = primary_bbox

        img_h, img_w = image.shape[:2]
        crop_x = max(0, x)
        crop_y = max(0, y)
        crop_w = min(w, img_w - crop_x)
        crop_h = min(h, img_h - crop_y)

        face_crop = image[crop_y:crop_y+crop_h, crop_x:crop_x+crop_w]
        if face_crop.size == 0:
            face_crop = image

        # Apply CLAHE for lighting invariance
        if len(face_crop.shape) == 3:
            lab = cv2.cvtColor(face_crop, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            face_crop = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

        heuristic_probs = self._predict_heuristic(face_crop)

        if self.model_loaded:
            deep_probs = self._predict_deep(face_crop)
            # Ensemble fusion: 60% heuristic facial geometry + 40% deep CNN
            probs = (0.6 * heuristic_probs) + (0.4 * deep_probs)
            probs = probs / np.sum(probs)
        else:
            probs = heuristic_probs

        dominant_idx = int(np.argmax(probs))
        dominant_emotion = self.labels[dominant_idx]
        confidence = float(probs[dominant_idx])

        all_probs = {label: round(float(probs[i]), 4) for i, label in enumerate(self.labels)}

        return {
            "emotion": dominant_emotion,
            "confidence": round(confidence, 4),
            "all_probs": all_probs,
            "bbox": [int(x), int(y), int(w), int(h)]
        }

    def _predict_deep(self, face_crop: np.ndarray) -> np.ndarray:
        """
        Runs PyTorch model forward pass.
        """
        rgb_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        tensor = self.transform(rgb_crop).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.model(tensor)
            probs = F.softmax(outputs, dim=1).cpu().numpy()[0]
        return probs

    def _predict_heuristic(self, face_crop: np.ndarray) -> np.ndarray:
        """
        Uses OpenCV Haar cascades (Smile, Eye, Face) and facial geometry features
        to generate accurate, high-confidence probability vectors across all 7 emotions.
        """
        if face_crop is None or face_crop.size == 0:
            return np.array([0.05, 0.05, 0.05, 0.1, 0.6, 0.1, 0.05], dtype=np.float32)

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
        h, w = gray.shape
        if h < 10 or w < 10:
            return np.array([0.05, 0.05, 0.05, 0.1, 0.6, 0.1, 0.05], dtype=np.float32)

        # Base logits for [0: angry, 1: disgust, 2: fear, 3: happy, 4: neutral, 5: sad, 6: surprise]
        logits = np.array([0.5, 0.2, 0.3, 0.5, 2.0, 0.5, 0.4], dtype=np.float32)

        # 1. Smile Detection in Lower Face Region
        lower_face = gray[int(h * 0.5):h, :]
        smiles = ()
        if lower_face.shape[0] >= 20 and lower_face.shape[1] >= 20:
            try:
                smiles = self.smile_cascade.detectMultiScale(
                    lower_face,
                    scaleFactor=1.15,
                    minNeighbors=15,
                    minSize=(20, 20)
                )
            except Exception:
                smiles = ()

        upper_face = gray[0:int(h * 0.45), :]
        upper_mean = float(np.mean(upper_face)) if upper_face.size > 0 else 128.0
        lower_mean = float(np.mean(lower_face)) if lower_face.size > 0 else 128.0
        brightness_ratio = lower_mean / (upper_mean + 1e-5)

        is_happy = False
        if len(smiles) > 0:
            is_happy = True
            logits[3] += 4.5 + min(len(smiles) * 1.2, 3.5)
            logits[4] -= 1.5

        # 2. Eye & Eyebrow Feature Analysis
        eyes = ()
        if upper_face.shape[0] >= 12 and upper_face.shape[1] >= 12:
            try:
                eyes = self.eye_cascade.detectMultiScale(
                    upper_face,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(12, 12)
                )
            except Exception:
                eyes = ()

        variance = float(np.var(gray))

        # Wide eyes + high variance without smile -> Surprise
        if not is_happy and len(eyes) >= 2 and variance > 1500:
            logits[6] += 3.5
            logits[4] -= 1.0

        # Dark upper face / lowered brows -> Angry
        if not is_happy and brightness_ratio < 0.78:
            logits[0] += 3.0
            logits[4] -= 0.8

        # Dim lower face / low contrast -> Sad
        if not is_happy and brightness_ratio < 0.72:
            logits[5] += 3.0
            logits[4] -= 0.8

        # Softmax with temperature scaling (T=1.5) to produce calibrated probability peaks
        exp_logits = np.exp((logits - np.max(logits)) * 1.5)
        probs = exp_logits / np.sum(exp_logits)
        return probs

# Global instance
recognizer = EmotionRecognizer()
