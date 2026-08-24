"""
EmoSense AI - Training Pipeline Wrapper for train.py
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from train import train

if __name__ == "__main__":
    train(
        data_dir="data",
        arch="seresnet",
        epochs=18,
        batch_size=64,
        lr=8e-4,
        output_dir="app/models",
        checkpoint_name="fer2013_model.pth"
    )
