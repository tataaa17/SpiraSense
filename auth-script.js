const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleLogin = document.getElementById('toggleLogin');
const toggleRegister = document.getElementById('toggleRegister');

// --- 1. TOGGLE TAMPILAN ---
toggleLogin.addEventListener('click', () => {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    toggleLogin.classList.add('active');
    toggleRegister.classList.remove('active');
});

toggleRegister.addEventListener('click', () => {
    registerForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    toggleRegister.classList.add('active');
    toggleLogin.classList.remove('active');
});

// --- 2. LOGIKA SIGN UP (REGISTRASI) ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nama_instansi: document.getElementById('regInstansi').value
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            alert("Registrasi Puskesmas Berhasil! Silakan masuk menggunakan akun tersebut.");
            
            // Bersihkan form agar tidak menumpuk
            registerForm.reset(); 
            
            // Pindah secara visual ke tab login
            toggleLogin.click(); 
        } else {
            alert("Gagal: " + result.message);
        }
    } catch (err) {
        alert("Gagal terhubung ke server pendaftaran.");
    }
});

// --- 3. LOGIKA SIGN IN (LOGIN) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            // Credentials 'include' sangat penting jika kamu tetap ingin pakai session
            credentials: 'include' 
        });

        const result = await response.json();

        if (result.status === 'success') {
            // --- BAGIAN PALING PENTING ---
            // Simpan ID Petugas ke "laci" browser (LocalStorage)
            // Agar saat tes, Python tahu siapa yang login (ID: 3, dll)
            localStorage.setItem('active_petugas_id', result.petugas_id);
            localStorage.setItem('isLoggedIn', 'true');
            
            console.log("Login sukses, Petugas ID:", result.petugas_id);
            
            // Pindah ke halaman utama tes
            window.location.href = 'test.html'; 
        } else {
            alert("Login Gagal: " + result.message);
        }
    } catch (err) {
        alert("Terjadi kesalahan koneksi ke server login.");
    }
});