// --- 1. INISIALISASI ---
const historyBody = document.getElementById('historyBody');
const searchInput = document.getElementById('searchInput');
let allHistoryData = [];

// --- 2. AMBIL DATA DARI FLASK ---
async function fetchHistory() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/history');
        allHistoryData = await response.json();
        renderTable(allHistoryData);
    } catch (error) {
        console.error("Gagal fetch data:", error);
        historyBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px;">Gagal terhubung ke server Flask.</td></tr>`;
    }
}

// --- 3. RENDER TABEL ---
function renderTable(data) {
    historyBody.innerHTML = '';

    if (data.length === 0) {
        historyBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#999;">Tidak ada riwayat ditemukan.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        const badgeClass = item.hasil === "Normal" ? "badge-normal" : "badge-parkinson";

        row.innerHTML = `
            <td style="color: #666; font-size: 0.85rem;">${item.tanggal}</td>
            <td><strong>${item.nama_pasien}</strong></td>
            <td><span style="color: #7F0303; font-weight: 600; font-size: 0.85rem;">${item.instansi}</span></td>
            <td>
                <img src="${item.visual}" onclick="openImageModal('${item.visual}')" 
                     style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid #eee;">
            </td>
            <td>
                <span class="badge ${badgeClass}">${item.hasil}</span>
                <div style="font-size: 0.7rem; color: #999; margin-top: 4px;">Confidence: ${item.level}</div>
            </td>
            <td style="font-size: 0.85rem; color: #555; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${item.catatan || '<span style="color:#ddd; font-style:italic;">Kosong</span>'}
            </td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn-action edit" onclick="openEditModal(${item.id}, '${item.catatan || ''}')" title="Edit Catatan">✏️</button>
                    <button class="btn-action delete" onclick="deleteRecord(${item.id})" title="Hapus">🗑️</button>
                </div>
            </td>
        `;
        historyBody.appendChild(row);
    });
}

// --- 4. FITUR UPDATE (EDIT CATATAN) ---
async function updateNotes(id, newNotes) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/update-history/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ catatan: newNotes })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            closeModal('editModal');
            fetchHistory(); // Refresh tabel
        } else {
            alert("Gagal update: " + result.message);
        }
    } catch (error) {
        alert("Terjadi kesalahan teknis saat mengupdate.");
    }
}

// --- 5. FITUR DELETE (HAPUS RIWAYAT) ---
async function deleteRecord(id) {
    if (confirm("Data ini akan dihapus permanen. Lanjutkan?")) {
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/delete-history/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (result.status === 'success') {
                fetchHistory();
            }
        } catch (error) {
            alert("Gagal menghapus data.");
        }
    }
}

// --- 6. MODAL HELPERS ---
function openImageModal(imgSrc) {
    const modal = document.getElementById('imageModal');
    const previewImg = document.getElementById('previewImg');
    previewImg.src = imgSrc;
    modal.classList.remove('hidden');
}

function openEditModal(id, currentNotes) {
    const modal = document.getElementById('editModal');
    const textArea = document.getElementById('editNotes');
    const saveBtn = document.getElementById('btnUpdateSave');

    textArea.value = currentNotes;
    modal.classList.remove('hidden');

    // Re-bind fungsi simpan dengan ID yang baru
    saveBtn.onclick = () => updateNotes(id, textArea.value);
}

// Fitur Pencarian
searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = allHistoryData.filter(i => i.nama_pasien.toLowerCase().includes(keyword));
    renderTable(filtered);
});

// Jalankan saat load
document.addEventListener('DOMContentLoaded', fetchHistory);