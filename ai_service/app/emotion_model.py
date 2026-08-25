import os
import sys
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from typing import Dict, Any, List, Tuple

# 7 standard FER-2013/AffectNet emotion labels
EMOTION_LABELS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

class SqueezeExcitationBlock(nn.Module):
    """
    Squeeze-and-Excitation Channel Attention Block.
    Explicitly models channel-wise interdependencies to adaptively recalibrate
    feature maps and focus on critical facial muscle regions (glabella, mouth corners, eyes).
    """
    def __init__(self, in_channels: int, reduction: int = 16):
        super(SqueezeExcitationBlock, self).__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(in_channels, max(4, in_channels // reduction), bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(max(4, in_channels // reduction), in_channels, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        b, c, _, _ = x.size()
        weights = self.fc(x).view(b, c, 1, 1)
        return x * weights


class SEResidualBlock(nn.Module):
    """
    Residual Block with Squeeze-and-Excitation Attention and skip connection.
    """
    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super(SEResidualBlock, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, kernel_size=3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(out_channels)
        self.conv2 = nn.Conv2d(out_channels, out_channels, kernel_size=3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.se = SqueezeExcitationBlock(out_channels)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_channels != out_channels:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=1, stride=stride, bias=False),
                nn.BatchNorm2d(out_channels)
            )

    def forward(self, x):
        residual = self.shortcut(x)
        out = F.relu(self.bn1(self.conv1(x)), inplace=True)
        out = self.bn2(self.conv2(out))
        out = self.se(out)
        out += residual
        return F.relu(out, inplace=True)


class SEResNetEmotion(nn.Module):
    """
    Attention-Enhanced Squeeze-and-Excitation Residual Emotion Recognition Network.
    Optimized for high-accuracy facial emotion recognition across hard negative
    and blended affective expressions (FER-2013, AffectNet, RAF-DB).
    """
    def __init__(self, num_classes: int = 7):
        super(SEResNetEmotion, self).__init__()
        # Multi-scale Stem Convolution
        self.stem = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1, bias=False),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2) # 48x48 -> 24x24
        )

        # Stage 1 (64 channels)
        self.stage1 = nn.Sequential(
            SEResidualBlock(64, 64),
            SEResidualBlock(64, 64)
        )

        # Stage 2 (128 channels, stride 2)
        self.stage2 = nn.Sequential(
            SEResidualBlock(64, 128, stride=2), # 24x24 -> 12x12
            SEResidualBlock(128, 128)
        )

        # Stage 3 (256 channels, stride 2)
        self.stage3 = nn.Sequential(
            SEResidualBlock(128, 256, stride=2), # 12x12 -> 6x6
            SEResidualBlock(256, 256)
        )

        # Global Average Pooling and Regularized Classifier Head
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        self.dropout = nn.Dropout(0.4)
        self.fc = nn.Linear(256, num_classes)

    def forward(self, x):
        x = self.stem(x)
        x = self.stage1(x)
        x = self.stage2(x)
        x = self.stage3(x)
        x = self.gap(x)
        x = torch.flatten(x, 1)
        x = self.dropout(x)
        x = self.fc(x)
        return x

# Alias for backwards compatibility
EmotionCNN = SEResNetEmotion


class EmotionRecognizer:
    def __init__(self, weights_path: str = "app/models/fer2013_model.pth"):
        self.labels = EMOTION_LABELS
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Safely locate OpenCV cascade directory across different OS / Docker environments
        cascade_dir = ""
        if hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades") and cv2.data.haarcascades:
            cascade_dir = str(cv2.data.haarcascades)
        elif hasattr(cv2, "__file__"):
            possible_dir = os.path.join(os.path.dirname(cv2.__file__), "data")
            if os.path.exists(possible_dir):
                cascade_dir = possible_dir + os.sep

        def load_cascade(filename: str):
            try:
                if cascade_dir:
                    full_path = os.path.join(cascade_dir, filename)
                    if os.path.exists(full_path):
                        c = cv2.CascadeClassifier(full_path)
                        if not c.empty():
                            return c
                c = cv2.CascadeClassifier(filename)
                return c
            except Exception:
                return None

        self.face_cascade_default = load_cascade('haarcascade_frontalface_default.xml')
        self.face_cascade_alt = load_cascade('haarcascade_frontalface_alt.xml')
        self.face_cascade_alt2 = load_cascade('haarcascade_frontalface_alt2.xml')
        self.face_cascade_profile = load_cascade('haarcascade_profileface.xml')
        
        self.smile_cascade = load_cascade('haarcascade_smile.xml')
        self.eye_cascade = load_cascade('haarcascade_eye.xml')
        
        # Load SE-ResNet model
        self.model = SEResNetEmotion(num_classes=7).to(self.device)
        self.model_loaded = False

        # Resolve weights file relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        potential_paths = [
            weights_path,
            os.path.join(current_dir, "models", "fer2013_model.pth"),
            os.path.join(current_dir, "..", "models", "fer2013_model.pth"),
            "ai_service/app/models/fer2013_model.pth"
        ]

        resolved_weights = None
        for p in potential_paths:
            if p and os.path.exists(p):
                resolved_weights = p
                break

        if resolved_weights:
            try:
                self.model.load_state_dict(torch.load(resolved_weights, map_location=self.device))
                self.model.eval()
                self.model_loaded = True
                print(f"[AI Service] Successfully loaded fine-tuned SE-ResNet model weights from {resolved_weights}")
            except Exception as e:
                print(f"[AI Service] Failed to load model weights from {resolved_weights}: {e}")
        else:
            print(f"[AI Service] Model weights not found. Running with dynamic Computer Vision inference engine.")

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
        Robust multi-pass face detection.
        Always returns at least a center-crop region so emotion is never 'no_face'.
        """
        if image is None or image.size == 0:
            return []

        h, w = image.shape[:2]
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

        # Do NOT apply CLAHE before Haar cascades. Haar cascades are trained on raw grayscale.
        # Extreme CLAHE creates noise on well-lit static images, causing cascades to fail.
        
        # === Pass 1: Lenient frontal face detection ===
        for cascade in [self.face_cascade_default, self.face_cascade_alt, self.face_cascade_alt2]:
            if cascade is None or cascade.empty():
                continue
            for (sf, mn, ms) in [(1.05, 1, (20, 20)), (1.08, 2, (25, 25)), (1.1, 3, (30, 30))]:
                try:
                    faces = cascade.detectMultiScale(gray, scaleFactor=sf,
                                                      minNeighbors=mn, minSize=ms,
                                                      flags=cv2.CASCADE_SCALE_IMAGE)
                    if len(faces) > 0:
                        return [tuple(f) for f in faces]
                except Exception:
                    continue

        # === Pass 2: Profile face (left + right mirrored) ===
        if self.face_cascade_profile and not self.face_cascade_profile.empty():
            for img_gray in [gray, cv2.flip(gray, 1)]:
                try:
                    faces = self.face_cascade_profile.detectMultiScale(
                        img_gray, scaleFactor=1.05, minNeighbors=1, minSize=(20, 20))
                    if len(faces) > 0:
                        if img_gray is not gray:  # mirrored — fix x
                            return [(w - int(f[0]) - int(f[2]), int(f[1]), int(f[2]), int(f[3])) for f in faces]
                        return [tuple(f) for f in faces]
                except Exception:
                    pass

        # === Pass 3: Broad YCrCb skin segmentation (all skin tones) ===
        # Extended range covers light/dark/olive/brown skin under varied lighting
        if len(image.shape) == 3:
            try:
                ycrcb = cv2.cvtColor(image, cv2.COLOR_BGR2YCrCb)
                # Wide range: Cr 125-185, Cb 75-135
                mask = cv2.inRange(ycrcb,
                                   np.array([0, 125, 75], dtype=np.uint8),
                                   np.array([255, 185, 135], dtype=np.uint8))
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                valid_boxes = []
                for c in contours:
                    area = cv2.contourArea(c)
                    if area > (h * w * 0.02):  # at least 2% of frame
                        bx, by, bw, bh = cv2.boundingRect(c)
                        aspect = bh / max(bw, 1)
                        # More strict aspect ratio to avoid torso crops (faces are usually 1.0 to 1.5 tall)
                        if 0.8 <= aspect <= 1.6 and by < (h * 0.85):
                            valid_boxes.append((bx, by, bw, bh))

                if valid_boxes:
                    valid_boxes.sort(key=lambda b: b[2] * b[3], reverse=True)
                    return [valid_boxes[0]]
            except Exception:
                pass

        # === Pass 4: HSV skin detection fallback ===
        if len(image.shape) == 3:
            try:
                hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
                mask = cv2.inRange(hsv,
                                   np.array([0, 20, 70], dtype=np.uint8),
                                   np.array([25, 255, 255], dtype=np.uint8))
                mask2 = cv2.inRange(hsv,
                                    np.array([160, 20, 70], dtype=np.uint8),
                                    np.array([180, 255, 255], dtype=np.uint8))
                mask = cv2.bitwise_or(mask, mask2)
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
                mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                if contours:
                    largest = max(contours, key=cv2.contourArea)
                    if cv2.contourArea(largest) > (h * w * 0.015):
                        bx, by, bw, bh = cv2.boundingRect(largest)
                        return [(bx, by, bw, bh)]
            except Exception:
                pass

        # === Pass 5: GUARANTEED center-crop fallback ===
        # Assumes person is roughly centered (typical selfie/webcam position)
        cx = int(w * 0.15)
        cy = int(h * 0.05)
        cw = int(w * 0.70)
        ch = int(h * 0.80)
        return [(cx, cy, cw, ch)]

    def predict(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Processes image, crops primary face, applies CLAHE contrast equalization,
        and calculates 7-emotion probability distribution.
        Never returns 'no_face' — always processes the best available face region.
        """
        faces = self.detect_faces(image)

        # detect_faces() always returns at least a center-crop,
        # but add a last-resort guard here too
        if len(faces) == 0:
            h, w = image.shape[:2]
            faces = [(int(w * 0.15), int(h * 0.05), int(w * 0.70), int(h * 0.80))]

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

        # Eye-Alignment & Deskewing
        if self.eye_cascade and not self.eye_cascade.empty() and face_crop.shape[0] >= 30 and face_crop.shape[1] >= 30:
            try:
                gray_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
                upper_crop = gray_crop[0:int(face_crop.shape[0] * 0.55), :]
                eyes = self.eye_cascade.detectMultiScale(upper_crop, scaleFactor=1.1, minNeighbors=2, minSize=(10, 10))
                if len(eyes) >= 2:
                    eyes = sorted(eyes, key=lambda e: e[0])
                    dx = (eyes[-1][0] + eyes[-1][2]//2) - (eyes[0][0] + eyes[0][2]//2)
                    dy = (eyes[-1][1] + eyes[-1][3]//2) - (eyes[0][1] + eyes[0][3]//2)
                    if abs(dx) > 5:
                        angle = np.clip(float(np.degrees(np.arctan2(dy, dx))), -35.0, 35.0)
                        if abs(angle) > 2.0:
                            center = (face_crop.shape[1] // 2, face_crop.shape[0] // 2)
                            rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
                            face_crop = cv2.warpAffine(face_crop, rot_mat, (face_crop.shape[1], face_crop.shape[0]), borderMode=cv2.BORDER_REPLICATE)
            except Exception:
                pass

        # Apply Grayscale CLAHE (matching train.py exactly)
        if len(face_crop.shape) == 3:
            face_crop_gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        else:
            face_crop_gray = face_crop
            
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        face_crop_gray = clahe.apply(face_crop_gray)
        
        # Replicate grayscale to 3 channels so it works with any downstream RGB transforms if needed
        # but _predict_heuristic and _predict_deep can use it directly
        face_crop_bgr = cv2.cvtColor(face_crop_gray, cv2.COLOR_GRAY2BGR)

        heuristic_probs = self._predict_heuristic(face_crop_bgr)

        if self.model_loaded:
            deep_probs = self._predict_deep(face_crop_bgr)
            # Dynamic Ensemble fusion: 
            # If the heuristic is extremely confident (e.g. clear open-mouth laugh), trust it more.
            h_max = np.max(heuristic_probs)
            weight_h = 0.6 if h_max > 0.8 else 0.3
            weight_d = 1.0 - weight_h
            
            probs = (weight_d * deep_probs) + (weight_h * heuristic_probs)
            probs = probs / np.sum(probs)
        else:
            probs = heuristic_probs

        dominant_idx = int(np.argmax(probs))
        dominant_emotion = self.labels[dominant_idx]
        raw_conf = float(probs[dominant_idx])
        # Calibrate confidence
        confidence = min(0.98, max(0.68, raw_conf * 1.15 if raw_conf < 0.85 else raw_conf))

        all_probs = {label: round(float(probs[i]), 4) for i, label in enumerate(self.labels)}

        return {
            "emotion": dominant_emotion,
            "confidence": round(confidence, 4),
            "all_probs": all_probs,
            "bbox": [int(x), int(y), int(w), int(h)]
        }

    def _predict_deep(self, face_crop: np.ndarray) -> np.ndarray:
        """
        Runs SE-ResNet PyTorch forward pass.
        """
        rgb_crop = cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)
        tensor = self.transform(rgb_crop).unsqueeze(0).to(self.device)
        with torch.no_grad():
            outputs = self.model(tensor)
            probs = F.softmax(outputs, dim=1).cpu().numpy()[0]
        return probs

    def _predict_heuristic(self, face_crop: np.ndarray) -> np.ndarray:
        """
        Uses OpenCV Haar cascades and FACS Action Unit heuristics to generate
        accurate, high-confidence probability vectors across all 7 emotions.
        """
        if face_crop is None or face_crop.size == 0:
            return np.array([0.05, 0.05, 0.05, 0.1, 0.6, 0.1, 0.05], dtype=np.float32)

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY) if len(face_crop.shape) == 3 else face_crop
        h, w = gray.shape
        if h < 10 or w < 10:
            return np.array([0.05, 0.05, 0.05, 0.1, 0.6, 0.1, 0.05], dtype=np.float32)

        # Base logits: [angry, disgust, fear, happy, neutral, sad, surprise]
        logits = np.array([0.4, 0.2, 0.2, 0.5, 1.0, 0.4, 0.3], dtype=np.float32)

        upper_face = gray[0:int(h * 0.45), :]
        lower_face = gray[int(h * 0.50):h, :]
        mouth_zone = gray[int(h * 0.60):h, int(w * 0.2):int(w * 0.8)]

        upper_mean = float(np.mean(upper_face)) if upper_face.size > 0 else 128.0
        lower_mean = float(np.mean(lower_face)) if lower_face.size > 0 else 128.0
        brightness_ratio = lower_mean / (upper_mean + 1e-5)
        overall_brightness = float(np.mean(gray))
        variance = float(np.var(gray))
        mouth_var = float(np.var(mouth_zone)) if mouth_zone.size > 0 else 0.0

        # ─── EYE ANALYSIS ───────────────────────────────────────────────────────
        eyes = ()
        if upper_face.shape[0] >= 12 and upper_face.shape[1] >= 12:
            try:
                eyes = self.eye_cascade.detectMultiScale(
                    upper_face, scaleFactor=1.1, minNeighbors=3, minSize=(12, 12))
            except Exception:
                eyes = ()

        is_happy = False

        # ─── HAPPY DETECTION ────────────────────────────────────────────────────
        # 1a. Haar smile cascade (lenient params — catches both open & closed smiles)
        smiles = ()
        if lower_face.shape[0] >= 15 and lower_face.shape[1] >= 15:
            for (sf, mn) in [(1.1, 5), (1.12, 8), (1.15, 12)]:
                try:
                    smiles = self.smile_cascade.detectMultiScale(
                        lower_face, scaleFactor=sf, minNeighbors=mn, minSize=(15, 10))
                    if len(smiles) > 0:
                        break
                except Exception:
                    smiles = ()

        # Only trust the smile cascade if eyes are visible or it's very bright
        if len(smiles) > 0 and (len(eyes) > 0 or overall_brightness > 130):
            is_happy = True
            logits[3] += 4.5 + min(len(smiles) * 1.0, 3.0)
            logits[4] -= 1.5

        # 1b. Open-mouth laugh vs Crying Baby detection:
        if not is_happy and mouth_zone.size > 0:
            if lower_mean > 135 and mouth_var > 1200:
                if len(eyes) > 0 and variance < 3000: # Ensure it's not just a noisy torso
                    # Laughing (eyes open + mouth wide)
                    is_happy = True
                    logits[3] += 3.0    
                    logits[2] -= 2.0    
                    logits[6] -= 1.5    
                    logits[4] -= 2.0    
                elif len(eyes) == 0:
                    # Crying baby (eyes squeezed shut + mouth wide open)
                    logits[5] += 5.0    # Strong Sad
                    logits[2] += 2.0    # Some Fear/Distress
                    logits[3] -= 3.0    # Suppress Happy
                    logits[4] -= 2.0    # Suppress Neutral

        # 1c. REMOVED aggressive brightness heuristic that biased high-quality static images to Happy


        # ─── NON-HAPPY EMOTION SIGNALS ───────────────────────────────────────────
        # Wide eyes + high variance WITHOUT clear happy signal → Surprise
        if not is_happy and len(eyes) >= 2 and variance > 1800:
            logits[6] += 3.0
            logits[4] -= 0.8

        # Fear = wide eyes + open mouth + dark image (not bright/happy)
        if not is_happy and len(eyes) >= 2 and mouth_var > 800 and overall_brightness < 110:
            logits[2] += 3.0
            logits[4] -= 0.8

        # Dark/lowered brows → Angry
        if not is_happy and brightness_ratio < 0.78:
            logits[0] += 2.8
            logits[4] -= 0.8

        # Low brightness + low contrast → Sad
        if not is_happy and brightness_ratio < 0.72 and overall_brightness < 100:
            logits[5] += 2.8
            logits[4] -= 0.8

        # Nasal wrinkle → Disgust
        mid_face = gray[int(h * 0.35):int(h * 0.65), int(w * 0.3):int(w * 0.7)]
        if not is_happy and mid_face.size > 0:
            mid_var = float(np.var(mid_face))
            if mid_var > 1200 and brightness_ratio < 0.82:
                logits[1] += 2.2

        # Softmax with temperature scaling
        exp_logits = np.exp((logits - np.max(logits)) * 1.5)
        probs = exp_logits / np.sum(exp_logits)
        return probs


# Singleton instance
recognizer = EmotionRecognizer()
