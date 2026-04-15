// Mengambil elemen-elemen penting
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const btnClear = document.getElementById('btnClear');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnDownload = document.getElementById('btnDownload');
const resultPanel = document.getElementById('resultPanel');
const progressIndicator = document.getElementById('progressIndicator');
const predictionOutput = document.getElementById('predictionOutput');

// Variabel untuk melacak status menggambar
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Pengaturan awal canvas (menggunakan palette Maroon untuk garis)
ctx.strokeStyle = '#7F0303'; // Maroon
ctx.lineWidth = 3;
ctx.lineJoin = 'round';
ctx.lineCap = 'round';

// --- FUNGSI DRAWING ---

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Mereset path agar garis tidak tersambung ke titik baru
}

function draw(e) {
    if (!isDrawing) return; // Berhenti jika mouse tidak ditekan

    const [x, y] = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();

    [lastX, lastY] = [x, y];
}

// Mendapatkan koordinat yang benar (mouse vs touch)
function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if (e.touches) { // Jika touchscreen
        x = (e.touches[0].clientX - rect.left) * scaleX;
        y = (e.touches[0].clientY - rect.top) * scaleY;
    } else { // Jika mouse
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }
    return [x, y];
}

// Event Listeners untuk Mouse
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Event Listeners untuk Touchscreen (Mobile)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Mencegah scrolling saat menggambar
    startDrawing(e);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
});
canvas.addEventListener('touchend', stopDrawing);


// --- FUNGSI KONTROL ---

// Tombol Clear: Menghapus gambar
btnClear.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Sembunyikan hasil lama jika ada
    resultPanel.classList.add('hidden');
});

// Tombol Download: Menyimpan gambar sebagai PNG (Opsional)
btnDownload.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'spirasense-drawing.png';
    link.click();
});


// --- FUNGSI ANALISIS (HUNGKAN KE BACKEND) ---

btnAnalyze.addEventListener('click', async () => {
    // 1. Validasi: Pastikan user sudah menggambar sesuatu (cek pixel data)
    const pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hasDrawing = false;
    for (let i = 3; i < pixelData.length; i += 4) { // Cek alpha channel
        if (pixelData[i] > 0) {
            hasDrawing = true;
            break;
        }
    }

    if (!hasDrawing) {
        alert("Silakan gambar spiral terlebih dahulu sebelum menganalisis.");
        return;
    }

    // 2. Tampilkan Progress Panel
    resultPanel.classList.remove('hidden');
    progressIndicator.classList.remove('hidden');
    predictionOutput.classList.add('hidden'); // Sembunyikan hasil sebelumnya

    // 3. Ambil data gambar dalam format Base64
    const imageDataURL = canvas.toDataURL('image/png');

    // --- INTEGRASI KE BACKEND PYTHON (FLASK/FASTAPI) ---
    // Ganti URL ini dengan URL server Python temanmu (misal: http://localhost:5000/predict)
    const backendUrl = 'http://localhost:5000/api/predict'; 

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: "demo_user", // Opsional, jika pakai autentikasi
                image: imageDataURL
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json(); // Mengambil hasil dari Python

        // 4. Update UI dengan hasil prediksi
        progressIndicator.classList.add('hidden');
        predictionOutput.classList.remove('hidden');

        document.getElementById('predictionLabel').innerText = data.prediction;
        document.getElementById('predictionConfidence').innerText = `Confidence: ${(data.confidence * 100).toFixed(1)}%`;

    } catch (error) {
        // Penanganan error jika backend tidak respon
        console.error("Analysis Error:", error);
        progressIndicator.classList.add('hidden');
        alert("Maaf, terjadi kesalahan saat menghubungi server analisis. Pastikan backend Python sudah berjalan.");
        resultPanel.classList.add('hidden');
    }
});

const btnSave = document.getElementById('btnSave');

btnSave.addEventListener('click', async () => {
    const patientName = document.getElementById('patientName').value;
    const testNotes = document.getElementById('testNotes').value;
    const prediction = document.getElementById('predictionLabel').innerText;
    
    if(!patientName) {
        alert("Harap isi nama pasien sebelum menyimpan.");
        return;
    }

    const payload = {
        name: patientName,
        notes: testNotes,
        result: prediction,
        date: new Date().toISOString()
    };

    console.log("Mengirim data ke CRUD Backend:", payload);
    
    // Ganti URL ini ke API Save temanmu (Python)
    // await fetch('http://localhost:5000/api/save', { ... });

    alert("Data berhasil disimpan ke database (CRUD: Create Success!)");
});