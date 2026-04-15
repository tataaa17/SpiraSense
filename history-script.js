// Simulasi Database
let historyData = [
    { 
        id: 1, 
        date: '2026-04-14', 
        name: 'Budi Santoso', 
        result: 'Normal', 
        confidence: '94%', 
        notes: 'Pasien dalam kondisi prima.',
        imageUrl: 'spiral-guide.png' // Nanti diganti data dari backend
    },
    { 
        id: 2, 
        date: '2026-04-15', 
        name: 'Siti Aminah', 
        result: 'Indikasi Parkinson', 
        confidence: '82%', 
        notes: 'Tremor ringan pada tangan kanan.',
        imageUrl: 'spiral-guide.png'
    }
];

const historyBody = document.getElementById('historyBody');
const editModal = document.getElementById('editModal');
const imageModal = document.getElementById('imageModal');
let currentEditId = null;

// RENDER TABEL (Fitur Read)
function renderTable() {
    historyBody.innerHTML = '';
    historyData.forEach(item => {
        const row = `
            <tr>
                <td>${item.date}</td>
                <td><strong>${item.name}</strong></td>
                <td><button class="btn-view" onclick="viewImage('${item.imageUrl}')">👁️ Lihat</button></td>
                <td><span style="color: ${item.result === 'Normal' ? 'green' : '#7F0303'}">${item.result}</span></td>
                <td>${item.confidence}</td>
                <td>${item.notes}</td>
                <td>
                    <button class="btn-edit" onclick="openEdit(${item.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteData(${item.id})">Hapus</button>
                </td>
            </tr>
        `;
        historyBody.insertAdjacentHTML('beforeend', row);
    });
}

// LIHAT GAMBAR
function viewImage(url) {
    document.getElementById('previewImg').src = url;
    imageModal.classList.remove('hidden');
}

// DELETE (Fitur Delete)
function deleteData(id) {
    if(confirm('Hapus riwayat pemeriksaan ini?')) {
        historyData = historyData.filter(item => item.id !== id);
        renderTable();
    }
}

// UPDATE (Fitur Update)
function openEdit(id) {
    currentEditId = id;
    const item = historyData.find(i => i.id === id);
    document.getElementById('editNotes').value = item.notes;
    editModal.classList.remove('hidden');
}

document.getElementById('btnUpdateSave').onclick = () => {
    const item = historyData.find(i => i.id === currentEditId);
    item.notes = document.getElementById('editNotes').value;
    closeModal('editModal');
    renderTable();
};

// GLOBAL CLOSE MODAL
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// Pencarian (Sederhana)
document.getElementById('searchInput').oninput = (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = historyData.filter(i => i.name.toLowerCase().includes(term));
    // Logika render untuk filter bisa ditambahkan di sini
};

renderTable();