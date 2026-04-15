from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
from tensorflow.keras.models import load_model
import base64
import numpy as np
import cv2

# --- BARIS INI WAJIB ADA (Didefinisikan Dulu) ---
app = Flask(__name__)
CORS(app)

# --- 1. LOAD MODEL ---
# Di laptop barumu ini sudah aman
model = load_model('model_spirasense.h5')

# --- 2. DEFINISIKAN ROUTE (PINTU API) ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        image_data = data['image'].split(",")[1]
        
        nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Preprocessing (Sesuaikan 224x224 dengan modelmu)
        img = cv2.resize(img, (224, 224)) 
        img = img / 255.0
        img = np.expand_dims(img, axis=0)

        prediction = model.predict(img)
        confidence = float(np.max(prediction))
        result = "Indikasi Parkinson" if np.argmax(prediction) == 1 else "Normal"

        return jsonify({
            "prediction": result,
            "confidence": confidence
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)