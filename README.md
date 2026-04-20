# SpiraSense - Parkinson's Early Screening System 
SpiraSense adalah aplikasi berbasis web yang dirancang untuk membantu deteksi dini indikasi penyakit Parkinson melalui analisis pola gambar spiral. Menggunakan algoritma Machine Learning XGBoost, sistem ini mampu mengenali karakteristik micro-tremor pada garis yang seringkali sulit dibedakan oleh mata manusia awam.


# Fitur Utama
- Digital Drawing Canvas: Antarmuka responsif untuk menggambar pola spiral secara langsung.
- Advanced Image Preprocessing: Menggunakan Grayscale Conversion dan Sharpening Filter (OpenCV) untuk mempertegas fitur getaran pada gambar.
- XGBoost Intelligence: Model klasifikasi yang dioptimalkan dengan scale_pos_weight untuk memastikan sensitivitas tinggi terhadap indikasi Parkinson (meminimalkan False Negative).
- Categorical Results: Output diagnosis yang humanis (Normal vs Indikasi Parkinson) disertai dengan tingkat akurasi kategori (Sedang/Tinggi).


# Instalasi & Cara Menjalankan
Ikuti langkah-langkah berikut untuk menjalankan SpiraSense di komputer lokal Anda:
1. Persiapan Folder : Pastikan seluruh file proyek (app.py, model, dan file HTML) berada dalam satu direktori yang sama.
2. Instalasi Library : Buka terminal atau command prompt pada direktori proyek, lalu jalankan perintah berikut untuk menginstal semua dependencies:
        Bash
        pip install flask flask-cors xgboost opencv-python scikit-learn numpy pandas
3. Konfigurasi Model : Pastikan file model AI bernama model_spirasense_xgb_v2.json sudah tersedia di folder utama. File ini adalah otak dari sistem SpiraSense.
4. Menjalankan Server Backend : Jalankan perintah berikut untuk menyalakan mesin Flask:
        Bash
        python app.py
    Jika berhasil, terminal akan menampilkan pesan:
    * Running on http://127.0.0.1:5000 (Biarkan terminal ini tetap terbuka selama penggunaan).
5. Mengakses Aplikasi : Buka file test.html langsung melalui browser Anda atau melalui alamat server jika Anda menggunakan fitur render_template.


# Struktur Folder
Berikut adalah struktur direktori penting dalam proyek SpiraSense:
Plaintext
├── app.py                      # Backend: Server Flask, Preprocessing, & Prediksi AI
├── model_spirasense_xgb_v2.json # Model: Hasil training XGBoost (Format JSON)
├── test.html                   # Frontend: Tampilan utama dan Kanvas Gambar
├── script.js                   # Logic: Menangani gambar dan komunikasi API
├── style.css                   # Design: Pengaturan tampilan UI aplikasi
└── README.md                   # Dokumentasi: Panduan penggunaan proyek


# Cara Penggunaan 
1. Buka halaman Test pada aplikasi web.
2. Gunakan mouse atau stylus untuk menggambar pola spiral pada kotak kanvas yang tersedia sesuai contoh.
3. Klik tombol "Analyze".
4. Sistem akan mengirimkan data gambar ke backend, melakukan pengolahan citra, dan menampilkan hasil diagnosa beserta tingkat akurasinya dalam hitungan detik.


# Informasi Teknis 
Sistem ini dikembangkan dengan pertimbangan sebagai berikut:
- Preprocessing: Gambar di-resize ke 64x64 piksel dan dipertegas menggunakan kernel penajaman untuk menonjolkan fitur tremor digital.
- Thresholding: Menggunakan ambang batas (threshold) sebesar 0.7 untuk menyeimbangkan antara presisi dan sensitivitas.
- Sensitivity: Model memberikan bobot lebih pada kelas Parkinson untuk memastikan deteksi dini yang lebih waspada.

# Kontributor
Team SpiraSense