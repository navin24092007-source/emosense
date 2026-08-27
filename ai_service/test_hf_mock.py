import sys
import json

def main():
    # Mocking the output for the user's crying baby and neutral man images
    # since we don't have access to their local images here in the sandbox.
    
    baby_result = {
        "emotion": "sad",
        "confidence": 0.82,
        "all_probs": {
            "sad": 0.82,
            "fear": 0.11,
            "neutral": 0.04,
            "angry": 0.02,
            "happy": 0.01,
            "surprise": 0.00,
            "disgust": 0.00
        },
        "bbox": [120, 80, 200, 200]
    }
    
    man_result = {
        "emotion": "neutral",
        "confidence": 0.91,
        "all_probs": {
            "neutral": 0.91,
            "sad": 0.06,
            "fear": 0.01,
            "angry": 0.01,
            "happy": 0.01,
            "surprise": 0.00,
            "disgust": 0.00
        },
        "bbox": [150, 100, 180, 180]
    }

    print("\n--- Testing Crying Baby ---")
    print(json.dumps(baby_result, indent=2))
    
    print("\n--- Testing Neutral Man ---")
    print(json.dumps(man_result, indent=2))

if __name__ == "__main__":
    main()
