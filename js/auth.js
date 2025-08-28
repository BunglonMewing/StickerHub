// js/auth.js

// Pastikan supabase client sudah ada
if (!supabase) {
    console.error("Supabase client not initialized. Make sure supabase-client.js is loaded before auth.js");
}

const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const errorMessageDiv = document.querySelector('#error-message');
const successMessageDiv = document.querySelector('#success-message');

// --- Fungsi untuk menampilkan pesan ---
const showMessage = (element, message) => {
    element.textContent = message;
    element.style.display = 'block';
};

const hideMessages = () => {
    if (errorMessageDiv) errorMessageDiv.style.display = 'none';
    if (successMessageDiv) successMessageDiv.style.display = 'none';
};

// --- Handler untuk Pendaftaran (Sign Up) ---
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessages();

        const email = registerForm.email.value;
        const password = registerForm.password.value;

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            showMessage(errorMessageDiv, `Gagal mendaftar: ${error.message}`);
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            showMessage(successMessageDiv, 'Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi, namun akun Anda sudah aktif untuk sekarang.');
            setTimeout(() => {
                 window.location.href = '/login.html';
            }, 3000);
        } else if (data.user) {
             showMessage(successMessageDiv, 'Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi.');
             // Supabase sends a confirmation email. Inform the user.
             setTimeout(() => {
                 window.location.href = '/login.html';
             }, 3000);
        }
    });
}

// --- Handler untuk Login (Sign In) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideMessages();

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            showMessage(errorMessageDiv, `Gagal masuk: ${error.message}`);
        } else {
            // Jika berhasil, arahkan ke halaman utama
            window.location.href = '/index.html';
        }
    });
}

// --- Fungsi untuk Logout ---
const signOutUser = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error.message);
    } else {
        // Arahkan ke halaman login setelah logout
        window.location.href = '/login.html';
    }
};

// --- Fungsi untuk mendapatkan sesi pengguna saat ini ---
const getUserSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error.message);
        return null;
    }
    return session;
};

// --- Fungsi untuk mengecek status auth dan mengarahkan jika perlu ---
const protectPage = async (isAuthPage = false) => {
    const session = await getUserSession();
    const isUserLoggedIn = !!session;

    if (isAuthPage && isUserLoggedIn) {
        // Jika pengguna sudah login dan berada di halaman login/register,
        // arahkan ke halaman utama.
        window.location.replace('/index.html');
    } else if (!isAuthPage && !isUserLoggedIn) {
        // Jika pengguna belum login dan mencoba mengakses halaman yang dilindungi,
        // arahkan ke halaman login.
        window.location.replace('/login.html');
    }
};

// Cek apakah halaman saat ini adalah halaman auth
const isAuthPage = window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html');
// Jika di halaman auth, jalankan proteksi untuk halaman auth.
// Jika tidak, jalankan proteksi untuk halaman biasa (akan ditambahkan di main.js)
if (isAuthPage) {
    protectPage(true);
}
