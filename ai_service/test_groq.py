import os
import sys
import json

# Ensure ai_service root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.emotion_model import predict_emotion_from_path, normalize_emotion_response, EMOTION_LABELS

def test_normalization():
    print("[1] Testing schema normalization...")
    mock_raw = {
        "emotion": "Sad",
        "confidence": 0.94,
        "all_probs": {
            "sad": 0.94,
            "fear": 0.03,
            "neutral": 0.02,
            "angry": 0.01,
            "happy": 0.00,
            "surprise": 0.00,
            "disgust": 0.00
        },
        "bbox": [100, 50, 200, 200]
    }
    normalized = normalize_emotion_response(mock_raw, (400, 400, 3))
    print("Normalized Output:")
    print(json.dumps(normalized, indent=2))
    
    assert normalized["emotion"] == "sad"
    assert normalized["confidence"] == 0.94
    assert len(normalized["all_probs"]) == 7
    assert normalized["bbox"] == [100, 50, 200, 200]
    print("Schema normalization test PASSED!\n")

def test_images_if_key_available():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("[2] GROQ_API_KEY not found in environment. Skipping live network call test.")
        print("    (Set GROQ_API_KEY in your environment or .env file to run live inference tests.)")
        return
    
    print("[2] Running live inference with Groq Vision on test images...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    baby_path = os.path.join(base_dir, "test_images", "crying_baby.jpg")
    man_path = os.path.join(base_dir, "test_images", "neutral_man.jpg")
    
    if os.path.exists(baby_path):
        print("\n--- Testing Crying Baby Image ---")
        baby_res = predict_emotion_from_path(baby_path)
        print(json.dumps(baby_res, indent=2))
        assert baby_res["emotion"] in EMOTION_LABELS
        
    if os.path.exists(man_path):
        print("\n--- Testing Neutral Man Image ---")
        man_res = predict_emotion_from_path(man_path)
        print(json.dumps(man_res, indent=2))
        assert man_res["emotion"] in EMOTION_LABELS

    print("\nLive Groq Vision inference test PASSED!")

if __name__ == "__main__":
    test_normalization()
    test_images_if_key_available()
