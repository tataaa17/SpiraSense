from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import xgboost as xgb
import base64
import numpy as np
import cv2
import os

app = Flask(__name__)

# Konfigurasi CORS agar mendukung pertukaran identitas (session/cookie)
CORS(app, supports_credentials=True)

# --- CONFIGURATION ---
app.secret_key = 'spira_sense_secret_key' 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///spirasensenew.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Pengaturan agar cookie session stabil antara port 5500 dan 5000
app.config.update(
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
)

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
    petugas_id = db.Column(db.Integer, db.ForeignKey('petugas.id'), nullable=True)
    hasil = db.Column(db.String(50))
    level = db.Column(db.String(50))
    visual = db.Column(db.Text)
    catatan = db.Column(db.Text, default="") # Kolom yang kamu tambahkan tadi
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
        session.permanent = True 
        return jsonify({
            "status": "success", 
            "petugas_id": user.id,
            "nama_instansi": user.nama_instansi
        })
    return jsonify({"status": "error", "message": "Email/Password salah!"}), 401

# --- 5. ENDPOINT WARGA ---
@app.route('/api/register-warga', methods=['POST'])
def register_warga():
    data = request.json
    nik_input = str(data.get('nik', '')).strip() # Ambil NIK dan hapus spasi jika ada

    # --- VALIDASI NIK: WAJIB 16 DIGIT ---
    if len(nik_input) != 16:
        return jsonify({
            "status": "error", 
            "message": f"NIK tidak valid! Harus tepat 16 digit. (Input Anda: {len(nik_input)} digit)"
        }), 400 # 400 adalah kode Error untuk 'Bad Request'

    # Cek apakah warga dengan NIK tersebut sudah ada di database
    warga_lama = Warga.query.filter_by(nik=nik_input).first()
    if warga_lama:
        # Jika sudah ada, langsung kembalikan ID-nya (agar tidak duplikat)
        return jsonify({"status": "success", "warga_id": warga_lama.id})
    
    try:
        # Jika NIK valid dan belum terdaftar, buat data baru
        warga_baru = Warga(
            nik=nik_input, 
            nama=data.get('nama'), 
            umur=data.get('umur'), 
            alamat=data.get('alamat', '')
        )
        db.session.add(warga_baru)
        db.session.commit()
        
        print(f"--- DEBUG: Warga baru berhasil didaftarkan: {warga_baru.nama} ---")
        return jsonify({"status": "success", "warga_id": warga_baru.id})
        
    except Exception as e:
        db.session.rollback() # Batalkan transaksi jika terjadi error database
        print(f"--- DEBUG ERROR: {str(e)} ---")
        return jsonify({"status": "error", "message": "Terjadi kesalahan pada database."}), 500

# --- 6. PREDIKSI (CREATE) ---
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        warga_id = data.get('warga_id')
        image_raw = data['image'].split(",")[1]
        p_id = data.get('petugas_id') or session.get('user_id')

        # Preprocessing
        processed_data = preprocess_image(image_raw)
        probabilities = model.predict_proba(processed_data)
        
        # Ambil probabilitas parkinson (indeks 1)
        park_prob = float(probabilities[0][1])
        norm_prob = float(probabilities[0][0])
        
        # --- KEMBALIKAN THRESHOLD---
        threshold = 0.58
        
        if park_prob > threshold:
            result = "Indikasi Parkinson"
            # Penentuan Level berdasarkan diskusi terakhir kita
            if park_prob > 0.8:
                level = "Tingkat Akurasi: Tinggi"
            else:
                level = "Tingkat Akurasi: Sedang"
            confidence = park_prob
        else:
            result = "Normal"
            level = "Kondisi: Stabil"
            confidence = norm_prob

        # Simpan ke Database (Jangan diubah agar kerjaan temanmu aman)
        if warga_id:
            history = Skrining(
                warga_id=warga_id,
                petugas_id=p_id,
                hasil=result,
                level=level,
                visual=data['image'],
                catatan="" 
            )
            db.session.add(history)
            db.session.commit()

        # Respon ke Frontend
        return jsonify({
            "status": "success",
            "prediction": result,
            "level": level,
            # Kita kirim angkanya, tapi kalau di HTML sudah kamu hapus, 
            # dia tidak akan muncul di web.
            "confidence": round(float(confidence) * 100, 2)
        })
    except Exception as e:
        print(f"Error: {str(e)}") # Agar terlihat di terminal kalau ada error
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 7. HISTORY (READ) ---
@app.route('/api/history', methods=['GET'])
def get_history():
    # Gunakan outerjoin agar data user "Umum" yang tidak punya petugas tetap muncul
    records = db.session.query(Skrining, Warga, Petugas)\
                .join(Warga, Skrining.warga_id == Warga.id)\
                .outerjoin(Petugas, Skrining.petugas_id == Petugas.id)\
                .order_by(Skrining.tanggal.desc()).all()
    
    output = []
    for s, w, p in records:
        output.append({
            "id": s.id,
            "tanggal": s.tanggal.strftime("%d %b %Y"),
            "nama_pasien": w.nama,
            "instansi": p.nama_instansi if p else "Mandiri/Umum",
            "hasil": s.hasil,
            "level": s.level,
            "visual": s.visual,
            "catatan": s.catatan 
        })
    return jsonify(output)

# --- 8. UPDATE NOTES (UPDATE) ---
@app.route('/api/update-history/<int:id>', methods=['PUT'])
def update_history(id):
    try:
        data = request.json
        record = Skrining.query.get(id)
        if not record:
            return jsonify({"status": "error", "message": "Data tidak ditemukan"}), 404
        
        record.catatan = data.get('catatan', '')
        db.session.commit()
        return jsonify({"status": "success", "message": "Catatan medis diperbarui!"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

# --- 9. DELETE HISTORY (DELETE) ---
@app.route('/api/delete-history/<int:id>', methods=['DELETE'])
def delete_history(id):
    try:
        record = Skrining.query.get(id)
        if record:
            db.session.delete(record)
            db.session.commit()
            return jsonify({"status": "success", "message": "Data berhasil dihapus"})
        return jsonify({"status": "error", "message": "Data tidak ditemukan"}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(debug=True, port=5000)