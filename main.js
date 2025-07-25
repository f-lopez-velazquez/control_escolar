import { auth, signInWithEmailAndPassword } from "./firebase.js";

// Instala PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (email !== "fco.lopezvelazquez@gmail.com") {
    loginError.textContent = "Solo el administrador puede iniciar sesión.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "admin/dashboard.html";
  } catch (error) {
    loginError.textContent = "Correo o contraseña incorrectos";
  }
});
