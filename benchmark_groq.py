import os
import time
import cv2
import base64
import dotenv
from groq import Groq

dotenv.load_dotenv('ai_service/.env')
client = Groq(api_key=os.environ.get('GROQ_API_KEY'), timeout=15.0)

img = cv2.imread('ai_service/test_images/crying_baby.jpg')
# Resize to 256x256 for fast transfer and inference
img = cv2.resize(img, (256, 256))
_, buf = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 70])
b64 = base64.b64encode(buf).decode('utf-8')

t0 = time.time()
try:
    res = client.chat.completions.create(
        model='qwen/qwen3.8-27b',
        messages=[
            {
                'role': 'user',
                'content': [
                    {'type': 'text', 'text': 'Classify face emotion (happy/sad/angry/surprise/fear/disgust/neutral). Return JSON: {"emotion": "...", "confidence": 0.9}'},
                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{b64}'}}
                ]
            }
        ],
        max_tokens=40,
        temperature=0.1
    )
    print(f"Success in {round(time.time() - t0, 2)}s:")
    print(res.choices[0].message.content)
except Exception as e:
    print(f"Error after {round(time.time() - t0, 2)}s: {e}")
