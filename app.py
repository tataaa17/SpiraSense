import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import InputLayer

# --- TRICK FIX UNTUK BEDA VERSI ---
class FixedInputLayer(InputLayer):
    def __init__(self, *args, **kwargs):
        # Kita buang 'batch_shape' dan 'optional' yang bikin error
        kwargs.pop('batch_shape', None)
        kwargs.pop('optional', None)
        super().__init__(*args, **kwargs)

# Daftarkan class 'InputLayer' agar diarahkan ke 'FixedInputLayer' buatan kita
custom_objects = {'InputLayer': FixedInputLayer}

# Sekarang load modelnya pakai custom_objects
model = load_model('model_spirasense.h5', custom_objects=custom_objects)

# --- ENDPOINT ANALISIS (Fitur Utama) ---
@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    image_data = data['image'].split(",")[1] # Mengambil data base64 dari canvas
    
    # Decode gambar
    nparr = np.frombuffer(base64.b64decode(image_data), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Preprocessing (Sesuaikan dengan training temanmu)
    img = cv2.resize(img, (224, 224)) 
    img = img / 255.0
    img = np.expand_dims(img, axis=0)

    # Prediksi
    prediction = model.predict(img)
    confidence = float(np.max(prediction))
    result = "Indikasi Parkinson" if np.argmax(prediction) == 1 else "Normal"

    return jsonify({
        "prediction": result,
        "confidence": confidence
    })

# --- ENDPOINT CRUD (Persiapan ETS) ---
@app.route('/api/save', methods=['POST'])
def save_data():
    # Di sini temanmu akan menulis kode untuk simpan ke Database (SQLite/MySQL)
    return jsonify({"message": "Data berhasil disimpan!"})

@app.route('/api/history', methods=['GET'])
def get_history():
    # Di sini temanmu akan menulis kode untuk mengambil data dari Database
    return jsonify({"history": []})

if __name__ == '__main__':
    app.run(debug=True, port=5000)