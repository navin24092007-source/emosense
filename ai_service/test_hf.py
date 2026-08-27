import sys
import json
from app.emotion_model import predict_emotion_from_path

def main():
    images = [
        ("Crying Baby", "test_images/crying_baby.png"),
        ("Neutral Man", "test_images/neutral_man.png")
    ]
    
    for name, path in images:
        print(f"\n--- Testing {name} ---")
        try:
            result = predict_emotion_from_path(path)
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Failed: {e}")

if __name__ == "__main__":
    main()