// --- 1. INISIALISASI ELEMEN ---
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const btnClear = document.getElementById('btnClear');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnDownload = document.getElementById('btnDownload');
const resultPanel = document.getElementById('resultPanel');
const progressIndicator = document.getElementById('progressIndicator');
const predictionOutput = document.getElementById('predictionOutput');

// Elemen Alur Pasien
const formWarga = document.getElementById('formWarga');
const sectionPasien = document.getElementById('patientRegistration');
const sectionTes = document.getElementById('mainTestGrid');
const displayNama = document.getElementById('displayNama');
const displayNik = document.getElementById('displayNik');

// Variabel Drawing
let isDrawing = false;
let lastX = 0, lastY = 0;

// Pengaturan Canvas (Warna Maroon khas SpiraSense)
ctx.strokeStyle = '#7F0303'; 
ctx.lineWidth = 4;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

// --- 2. LOGIKA PENDAFTARAN PASIEN ---
formWarga.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah refresh halaman
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
            credentials: 'include' // PENTING: Mengirim cookie session petugas
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Simpan ID Warga untuk proses prediksi nanti
            localStorage.setItem('current_warga_id', result.warga_id);
            
            // Update Banner Info Pasien
            displayNama.innerText = dataPasien.nama;
            displayNik.innerText = dataPasien.nik;

            // Transisi Visual
            sectionPasien.classList.add('hidden');
            sectionTes.classList.remove('hidden');
            console.log("Registrasi warga sukses, ID:", result.warga_id);
        } else {
            alert("Gagal daftar: " + result.message);
        }
    } catch (err) {
        console.error("Error pendaftaran:", err);
        alert("Gagal menghubungi server. Pastikan Flask sudah jalan.");
    }
});

// --- 3. FUNGSI DRAWING (Sesuai kode kamu) ---
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

// --- 4. LOGIKA ANALISIS & AUTO-SAVE ---
btnAnalyze.addEventListener('click', async () => {
    // Validasi apakah sudah menggambar
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasDrawing = false;
    for (let i = 3; i < pixelData.length; i += 4) {
        if (pixelData[i] > 0) { hasDrawing = true; break; }
    }

    if (!hasDrawing) {
        alert("Silakan gambar spiral terlebih dahulu.");
        return;
    }

    // UI Feedback
    resultPanel.classList.remove('hidden');
    progressIndicator.classList.remove('hidden');
    predictionOutput.classList.add('hidden');

    const imageDataURL = canvas.toDataURL('image/png');
    const wargaId = localStorage.getItem('current_warga_id');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: imageDataURL,
                warga_id: wargaId
            }),
            credentials: 'include' // PENTING: Agar petugas_id terekam di database
        });

        const data = await response.json();

        progressIndicator.classList.add('hidden');
        predictionOutput.classList.remove('hidden');

        // Update Label Hasil
        const label = document.getElementById('predictionLabel');
        label.innerText = data.prediction;
        document.getElementById('predictionConfidence').innerText = `Confidence: ${data.confidence}%`;

        // Styling Warna Hasil
        label.style.color = (data.prediction === "Normal") ? "#27ae60" : "#7F0303";

    } catch (error) {
        console.error("Error prediksi:", error);
        progressIndicator.classList.add('hidden');
        alert("Terjadi kesalahan saat menghubungi server prediksi.");
    }
});

// --- 5. KONTROL TOMBOL ---
btnClear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resultPanel.classList.add('hidden');
});

btnDownload.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `SpiraSense_${displayNama.innerText}_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL();
    link.click();
});