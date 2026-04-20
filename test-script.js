// --- 1. INISIALISASI ELEMEN ---
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const btnClear = document.getElementById('btnClear');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnDownload = document.getElementById('btnDownload');
const resultPanel = document.getElementById('resultPanel');
const progressIndicator = document.getElementById('progressIndicator');
const predictionOutput = document.getElementById('predictionOutput');
const predictionLabel = document.getElementById('predictionLabel'); // Label hasil utama

// Elemen Alur Pasien
const formWarga = document.getElementById('formWarga');
const sectionPasien = document.getElementById('patientRegistration');
const sectionTes = document.getElementById('mainTestGrid');
const displayNama = document.getElementById('displayNama');
const displayNik = document.getElementById('displayNik');

// Variabel Drawing
let isDrawing = false;
let lastX = 0, lastY = 0;

// Pengaturan Canvas
ctx.strokeStyle = '#7F0303'; 
ctx.lineWidth = 4;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

// --- 2. LOGIKA PENDAFTARAN PASIEN ---
formWarga.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    console.log("Mendaftarkan pasien...");

    const dataPasien = {
        nik: document.getElementById('nik').value,
        nama: document.getElementById('nama').value,
        umur: document.getElementById('umur').value,
        alamat: document.getElementById('alamat').value
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/register-warga', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataPasien),
            credentials: 'include' 
        });

        const result = await response.json();

        if (result.status === 'success') {
            localStorage.setItem('current_warga_id', result.warga_id);
            
            displayNama.innerText = dataPasien.nama;
            displayNik.innerText = dataPasien.nik;

            sectionPasien.classList.add('hidden');
            sectionTes.classList.remove('hidden');
            console.log("Warga terdaftar, ID:", result.warga_id);
        } else {
            alert("Gagal daftar: " + result.message);
        }
    } catch (err) {
        console.error("Error pendaftaran:", err);
        alert("Gagal menghubungi server.");
    }
});

// --- 3. FUNGSI DRAWING ---
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x, y;
    if (e.touches) {
        x = (e.touches[0].clientX - rect.left) * scaleX;
        y = (e.touches[0].clientY - rect.top) * scaleY;
    } else {
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }
    return [x, y];
}

function startDrawing(e) { isDrawing = true; [lastX, lastY] = getCoordinates(e); }
function stopDrawing() { isDrawing = false; ctx.beginPath(); }
function draw(e) {
    if (!isDrawing) return;
    const [x, y] = getCoordinates(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
    [lastX, lastY] = [x, y];
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, {passive: false});
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, {passive: false});
canvas.addEventListener('touchend', stopDrawing);

// --- 4. LOGIKA ANALISIS ---
btnAnalyze.addEventListener('click', async () => {
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasDrawing = false;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0) { hasDrawing = true; break; }
    }

    if (!hasDrawing) {
        alert("Silakan gambar spiral terlebih dahulu.");
        return;
    }

    // Tampilkan Loading
    progressIndicator.classList.remove('hidden');
    predictionOutput.classList.add('hidden');

    const imageDataURL = canvas.toDataURL('image/png');
    const wargaId = localStorage.getItem('current_warga_id');
    const petugasId = localStorage.getItem('active_petugas_id'); 

    try {
        const response = await fetch('http://127.0.0.1:5000/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageDataURL,
                warga_id: wargaId,
                petugas_id: petugasId 
            }),
            credentials: 'include' 
        });

        const data = await response.json();

        if (data.status === 'success') {
            progressIndicator.classList.add('hidden');
            predictionOutput.classList.remove('hidden');

            // Set Teks Hasil
            predictionLabel.innerText = data.prediction;

            // Atur Warna Berdasarkan Hasil
            predictionLabel.classList.remove('result-normal', 'result-parkinson');
            if (data.prediction === "Normal") {
                predictionLabel.classList.add('result-normal');
            } else {
                predictionLabel.classList.add('result-parkinson');
            }
            
            // Note: Baris confidence dihapus sesuai request kamu
            console.log("Analisis Berhasil:", data.prediction);
        } else {
            progressIndicator.classList.add('hidden');
            alert("Gagal Analisis: " + data.message);
        }

    } catch (error) {
        console.error("Error prediksi:", error);
        progressIndicator.classList.add('hidden');
        alert("Terjadi kesalahan saat menghubungi server.");
    }
});

// --- 5. KONTROL TOMBOL ---
btnClear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Kita hanya sembunyikan output prediksi, bukan seluruh resultPanel
    // Agar Informasi Pasien tetap terlihat di kanan atas
    predictionOutput.classList.add('hidden');
});

btnDownload.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `SpiraSense_${displayNama.innerText}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
});