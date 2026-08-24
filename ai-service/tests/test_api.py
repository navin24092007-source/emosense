import pytest
from fastapi.testclient import TestClient
import numpy as np
import cv2
import base64
import io
from PIL import Image

from app.main import app

client = TestClient(app)

def create_dummy_image_base64():
    """Generates a dummy 100x100 RGB image as base64 string"""
    img = Image.fromarray(np.uint8(np.random.rand(100, 100, 3) * 255))
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{img_str}"

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "happy" in data["labels"]

def test_predict_frame():
    base64_str = create_dummy_image_base64()
    response = client.post("/predict_frame", json={"image_base64": base64_str})
    assert response.status_code == 200
    data = response.json()
    assert "emotion" in data
    assert "confidence" in data
    assert "all_probs" in data
    assert len(data["bbox"]) == 4

def test_predict_image():
    # Create test image file
    img = Image.fromarray(np.uint8(np.random.rand(100, 100, 3) * 255))
    buffered = io.BytesIO()
    img.save(buffered, format="JPEG")
    buffered.seek(0)
    
    response = client.post(
        "/predict_image",
        files={"file": ("test.jpg", buffered, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "emotion" in data
    assert "confidence" in data
    assert isinstance(data["confidence"], float)
