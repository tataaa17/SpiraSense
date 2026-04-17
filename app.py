from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
import base64
import numpy as np
import cv2
import os

app = Flask(__name__)
CORS(app)

# --- 1. LOAD MODEL XGBOOST ---
# Pastikan file .json hasil download dari Colab ada di folder yang sama
model_path = 'model_spirasense_xgb_v2.json'

if os.path.exists(model_path):
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    print("Model XGBoost berhasil dimuat!")
else:
    print(f"ERROR: File {model_path} tidak ditemukan di folder proyek.")

# --- 2. FUNGSI PREPROCESSING (Wajib sama dengan di Colab) ---
def preprocess_image(img_data):
    # Decode base64 ke OpenCV format
    nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE) # Gunakan Grayscale
    
    # Resize ke 64x64 (Sesuai training di Colab)
    img = cv2.resize(img, (64, 64))
    
    # Penajaman (Sharpening)
    kernel = np.array([[-1,-1,-1], 
                       [-1, 5,-1],
                       [-1,-1,-1]])
    img = cv2.filter2D(img, -1, kernel)
    
    # Flatten (Ubah jadi 1 baris/vektor untuk XGBoost)
    img_flattened = img.flatten().reshape(1, -1)
    return img_flattened

# --- 3. ENDPOINT PREDIKSI ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({"error": "No image data"}), 400
            
        image_data = data['image'].split(",")[1]
        
        # Jalankan Preprocessing
        processed_data = preprocess_image(image_data)
        
        # Prediksi Probabilitas
        probabilities = model.predict_proba(processed_data)
        
        # Ambil probabilitas parkinson (indeks 1)
        parkinson_prob = float(probabilities[0][1]) # Langsung konversi ke float Python
        normal_prob = float(probabilities[0][0])    # Langsung konversi ke float Python
        
        threshold = 0.6 # Sesuai diskusi kita, biar tidak terlalu paranoid
        
        if parkinson_prob > threshold:
            result = "Indikasi Parkinson"
            # Ambil nilai probabilitas parkinson sebagai confidence
            confidence = parkinson_prob
        else:
            result = "Normal"
            # Ambil nilai probabilitas normal sebagai confidence
            confidence = normal_prob

        return jsonify({
            "prediction": result,
            "confidence": round(confidence * 100, 2), # Hasilnya misal: 88.99
            "raw_prob": round(parkinson_prob, 4)
        })
        
    except Exception as e:
        # Ini akan membantu kamu melihat error apa yang terjadi di terminal VS Code
        print(f"Error during prediction: {str(e)}")
        return jsonify({"error": str(e)}), 500

# --- 4. ENDPOINT SIMPLE CRUD (Placeholder) ---
@app.route('/api/save', methods=['POST'])
def save_result():
    # Tempat temanmu nanti menambahkan logika simpan ke Database (SQLite/MySQL)
    return jsonify({"status": "success", "message": "Data tersimpan di server"})

if __name__ == '__main__':
    # Server berjalan di port 5000
    app.run(debug=True, port=5000)