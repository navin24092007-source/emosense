# EmoSense - Streamlit Entry Point
import os
import sys

# Forward execution to streamlit_app.py
current_dir = os.path.dirname(os.path.abspath(__file__))
streamlit_main = os.path.join(current_dir, "streamlit_app.py")

with open(streamlit_main, "r", encoding="utf-8") as f:
    code = f.read()

exec(code)
