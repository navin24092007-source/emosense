import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

model_path = 'app/blaze_face_short_range.tflite'
BaseOptions = mp.tasks.BaseOptions
FaceDetector = mp.tasks.vision.FaceDetector
FaceDetectorOptions = mp.tasks.vision.FaceDetectorOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = FaceDetectorOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.IMAGE)

with FaceDetector.create_from_options(options) as detector:
    img = cv2.imread('test_images/crying_baby.png')
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    face_detector_result = detector.detect(mp_image)
    
    for detection in face_detector_result.detections:
        bbox = detection.bounding_box
        print(f"Bbox: {bbox.origin_x}, {bbox.origin_y}, {bbox.width}, {bbox.height}")
