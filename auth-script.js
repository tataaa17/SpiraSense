const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toggleLogin = document.getElementById('toggleLogin');
const toggleRegister = document.getElementById('toggleRegister');

// Toggle tampilan Login & Register
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

// LOGIKA SIGN UP (REGISTRASI)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        nama_instansi: document.getElementById('regInstansi').value
    };

    const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    alert(result.message);
    if (result.status === 'success') {
        toggleLogin.click(); // Pindah ke tab login
    }
});

// LOGIKA SIGN IN (LOGIN)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
    };

    const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    if (result.status === 'success') {
        // Simpan status login sederhana (opsional)
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'test.html'; // Pindah ke halaman tes warga
    } else {
        alert(result.message);
    }
});
