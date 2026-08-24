import base64
import io
# pyrefly: ignore [missing-import]
import numpy as np
import cv2
from PIL import Image

def decode_base64_image(base64_str: str) -> np.ndarray:
    """
    Decodes a base64 encoded image string (with or without data URI prefix)
    into an OpenCV BGR numpy array safely.
    """
    if not base64_str or not isinstance(base64_str, str):
        raise ValueError("Empty or invalid base64 image data")

    if "," in base64_str:
        base64_str = base64_str.split(",", 1)[1]
    
    # Clean string and repair padding
    base64_str = base64_str.strip().replace(" ", "+").replace("\n", "").replace("\r", "")
    missing_padding = len(base64_str) % 4
    if missing_padding:
        base64_str += "=" * (4 - missing_padding)

    image_bytes = base64.b64decode(base64_str)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    # Convert RGB to BGR for OpenCV
    bgr_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return bgr_img

def read_upload_image(file_bytes: bytes) -> np.ndarray:
    """
    Reads uploaded file bytes into an OpenCV BGR numpy array.
    """
    image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    bgr_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return bgr_img

def crop_face(image: np.ndarray, bbox: tuple) -> np.ndarray:
    """
    Crops face region given (x, y, w, h).
    """
    x, y, w, h = bbox
    img_h, img_w = image.shape[:2]
    # Ensure boundaries are within image
    x = max(0, x)
    y = max(0, y)
    w = min(w, img_w - x)
    h = min(h, img_h - y)
    
    if w <= 0 or h <= 0:
        return image
        
    return image[y:y+h, x:x+w]
