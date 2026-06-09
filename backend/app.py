"""
FireGuard AI — Flask Backend
Routes: POST /api/predict  |  POST /api/predict-frame  |  GET /api/history  |  DELETE /api/history  |  DELETE /api/history/<id>
"""

import os
import io
import base64
import json
import uuid
from datetime import datetime

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image

# -- TensorFlow / Model loading ------------------------------------------------
try:
    import tensorflow as tf
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "fire_detection_v1final.keras")
    if os.path.exists(MODEL_PATH):
        model = tf.keras.models.load_model(MODEL_PATH)
        MODEL_LOADED = True
        print("[OK]  Model loaded: fire_detection_v1.keras")
    else:
        model = None
        MODEL_LOADED = False
        print("[WARN] Model file not found. Place fire_detection_v1.keras in backend/.")
except Exception:
    model = None
    MODEL_LOADED = False
    print("[WARN] TensorFlow unavailable -- running in stub mode.")

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
HISTORY_FILE  = os.path.join(os.path.dirname(__file__), "history.json")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config["UPLOAD_FOLDER"]      = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024   # 10 MB

# ── Constants ──────────────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}

# Class order MUST match the order used during model training.
CLASS_NAMES = ["smoke", "fire", "non_fire"]

IMG_SIZE = (128, 128)   # Model input: 128 × 128 × 3


# ── Utilities ──────────────────────────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def preprocess_image(path: str) -> np.ndarray:
    """Load → RGB → resize → normalise → expand dims."""
    img = Image.open(path).convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)   # (1, 128, 128, 3)


def preprocess_pil(img: Image.Image) -> np.ndarray:
    """PIL image → RGB → resize → normalise → expand dims."""
    img = img.convert("RGB")
    img = img.resize(IMG_SIZE)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)   # (1, 128, 128, 3)


def risk_level(prediction: str, confidence: float) -> str:
    if prediction == "fire":
        return "high"
    if prediction == "smoke":
        return "medium"
    return "low"


def predict_from_array(img_array: np.ndarray, source: str = "upload") -> dict:
    """Shared prediction logic used by both upload and frame endpoints."""
    preds        = model.predict(img_array, verbose=0)[0]   # shape: (3,)

    predicted_idx   = int(np.argmax(preds))
    predicted_class = CLASS_NAMES[predicted_idx]
    confidence      = round(float(preds[predicted_idx]) * 100, 2)

    # All-class scores
    scores = {cls: round(float(preds[i]) * 100, 2) for i, cls in enumerate(CLASS_NAMES)}

    # Map model output to frontend type ('non_fire' → 'non-fire')
    frontend_prediction = predicted_class.replace("_", "-")

    return {
        "id":         f"det-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}",
        "prediction": frontend_prediction,
        "confidence": confidence,
        "riskLevel":  risk_level(predicted_class, confidence),
        "scores":     scores,
        "model":      "fire_detection_v1final.keras",
        "source":     source,
        "timestamp":  datetime.utcnow().isoformat() + "Z",
    }


# ── History helpers ─────────────────────────────────────────────────────────────
def load_history() -> list:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def save_history(history: list) -> None:
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model_loaded": MODEL_LOADED,
        "model": "fire_detection_v1.keras",
        "classes": CLASS_NAMES,
        "input_shape": list(IMG_SIZE) + [3],
    })


@app.route("/api/predict", methods=["POST"])
def predict():
    # ── Validate ──────────────────────────────────────────────────────────────
    if "image" not in request.files:
        return jsonify({"error": "No image file provided"}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use JPG, JPEG, or PNG."}), 400

    # ── Save temporarily ──────────────────────────────────────────────────────
    filename  = secure_filename(file.filename)
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(save_path)

    try:
        if not MODEL_LOADED or model is None:
            return jsonify({
                "error": "Model not loaded. Place fire_detection_v1.keras in backend/.",
                "model_loaded": False,
            }), 503

        # ── Inference (shared pipeline) ───────────────────────────────────────
        img_array = preprocess_image(save_path)
        result    = predict_from_array(img_array, source="upload")

        # ── Persist to history ────────────────────────────────────────────────
        history = load_history()
        history.insert(0, result)
        history = history[:50]   # keep last 50
        save_history(history)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    finally:
        if os.path.exists(save_path):
            os.remove(save_path)


@app.route("/api/predict-frame", methods=["POST"])
def predict_frame():
    """Accept a single camera frame (base64-encoded) and return a prediction."""
    data = request.get_json(silent=True)
    if not data or "frame" not in data:
        return jsonify({"error": "No frame data provided. Send JSON with a 'frame' key."}), 400

    if not MODEL_LOADED or model is None:
        return jsonify({
            "error": "Model not loaded. Place fire_detection_v1.keras in backend/.",
            "model_loaded": False,
        }), 503

    try:
        # ── Decode base64 → PIL Image ─────────────────────────────────────────
        frame_b64 = data["frame"]
        # Strip optional data-URI prefix
        if "," in frame_b64:
            frame_b64 = frame_b64.split(",", 1)[1]
        img_bytes = base64.b64decode(frame_b64)
        img = Image.open(io.BytesIO(img_bytes))

        # ── Inference (shared pipeline) ───────────────────────────────────────
        img_array = preprocess_pil(img)
        result    = predict_from_array(img_array, source="camera")

        # ── Persist to history ────────────────────────────────────────────────
        save_to_history = data.get("saveToHistory", False)
        if save_to_history:
            history = load_history()
            history.insert(0, result)
            history = history[:50]
            save_history(history)

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"Frame prediction failed: {str(e)}"}), 500


@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify(load_history())


@app.route("/api/history", methods=["DELETE"])
def clear_history():
    save_history([])
    return jsonify({"message": "History cleared"})


@app.route("/api/history/<item_id>", methods=["DELETE"])
def delete_history_item(item_id: str):
    history = load_history()
    history = [h for h in history if h.get("id") != item_id]
    save_history(history)
    return jsonify({"message": "Item deleted"})


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[*] FireGuard AI -- Flask Backend")
    print("    Model loaded : " + str(MODEL_LOADED))
    print("    Listening on : http://localhost:5001")
    app.run(debug=True, host="0.0.0.0", port=5001)
