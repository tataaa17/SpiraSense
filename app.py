from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import xgboost as xgb
import base64
import numpy as np
import cv2
import os

app = Flask(__name__)
# Agar session bisa tersimpan di browser (withCredentials)
CORS(app, supports_credentials=True)

# --- CONFIGURATION ---
app.secret_key = 'spira_sense_secret_key' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///spirasensenew.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- 1. DATABASE MODELS ---
class Petugas(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    nama_instansi = db.Column(db.String(100))

class Warga(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nik = db.Column(db.String(16), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    umur = db.Column(db.Integer)
    alamat = db.Column(db.Text)

class Skrining(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    warga_id = db.Column(db.Integer, db.ForeignKey('warga.id'))
    petugas_id = db.Column(db.Integer, db.ForeignKey('petugas.id'))
    hasil = db.Column(db.String(50))
    level = db.Column(db.String(50))
    visual = db.Column(db.Text)
    tanggal = db.Column(db.DateTime, default=db.func.current_timestamp())

# --- 2. LOAD MODEL XGBOOST ---
model = xgb.XGBClassifier()
model_path = 'model_spirasense_xgb_v2.json'
if os.path.exists(model_path):
    model.load_model(model_path)
    print("✅ Model XGBoost berhasil dimuat!")

# --- 3. PREPROCESSING ---
def preprocess_image(img_data):
    nparr = np.frombuffer(base64.b64decode(img_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    img = cv2.resize(img, (64, 64))
    kernel = np.array([[-1,-1,-1], [-1, 5,-1], [-1,-1,-1]])
    img = cv2.filter2D(img, -1, kernel)
    return img.flatten().reshape(1, -1)

# --- 4. ENDPOINTS PETUGAS ---
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    if Petugas.query.filter_by(email=data['email']).first():
        return jsonify({"status": "error", "message": "Email sudah terdaftar!"}), 400
    baru = Petugas(email=data['email'], password=data['password'], nama_instansi=data['nama_instansi'])
    db.session.add(baru)
    db.session.commit()
    return jsonify({"status": "success", "message": "Registrasi Berhasil!"})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    user = Petugas.query.filter_by(email=data['email'], password=data['password']).first()
    if user:
        session['user_id'] = user.id 
        session.permanent = True # Agar session tidak cepat hilang
        return jsonify({"status": "success", "message": "Login Berhasil!"})
    return jsonify({"status": "error", "message": "Email/Password salah!"}), 401

# --- 5. ENDPOINT WARGA ---
@app.route('/api/register-warga', methods=['POST'])
def register_warga():
    data = request.json
    warga_lama = Warga.query.filter_by(nik=data['nik']).first()
    if warga_lama:
        return jsonify({"status": "success", "warga_id": warga_lama.id})
    try:
        warga_baru = Warga(nik=data['nik'], nama=data['nama'], umur=data['umur'], alamat=data.get('alamat', ''))
        db.session.add(warga_baru)
        db.session.commit()
        return jsonify({"status": "success", "warga_id": warga_baru.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 6. PREDIKSI & AUTO-SAVE (FIXED) ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        warga_id = data.get('warga_id')
        image_raw = data['image'].split(",")[1] # Ambil data base64
        
        p_id = session.get('user_id') 
        print(f"--- DEBUG: Akses oleh Petugas ID: {p_id} ---")

        if not p_id:
            return jsonify({"status": "error", "message": "Sesi login hilang, silakan login ulang!"}), 401

        # LOGIKA PREDIKSI (YANG SEMPAT HILANG)
        processed_data = preprocess_image(image_raw)
        probabilities = model.predict_proba(processed_data)
        parkinson_prob = float(probabilities[0][1])
        
        result = "Indikasi Parkinson" if parkinson_prob > 0.6 else "Normal"
        level = "Tinggi" if parkinson_prob > 0.8 else "Stabil"

        # SIMPAN KE DATABASE
        if warga_id:
            history = Skrining(
                warga_id=warga_id,
                petugas_id=p_id,
                hasil=result,
                level=level,
                visual=data['image']
            )
            db.session.add(history)
            db.session.commit()

        return jsonify({
            "status": "success",
            "prediction": result,
            "level": level,
            "confidence": round(float(np.max(probabilities)) * 100, 2)
        })
    except Exception as e:
        print(f"ERROR PREDICT: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 7. HISTORY ---
@app.route('/api/history', methods=['GET'])
def get_history():
    records = db.session.query(Skrining, Warga).join(Warga).all()
    output = []
    for skrining, warga in records:
        output.append({
            "id": skrining.id,
            "tanggal": skrining.tanggal.strftime("%Y-%m-%d %H:%M"),
            "nama_pasien": warga.nama,
            "hasil": skrining.hasil,
            "level": skrining.level,
            "visual": skrining.visual
        })
    return jsonify(output)

if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(debug=True, port=5000)