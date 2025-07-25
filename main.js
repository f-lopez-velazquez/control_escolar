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
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // IMPORTANTE: compara en minúsculas por si acaso hay confusión
    if (user.email.toLowerCase() === "fco.lopezvelazquez@ugto.mx") {
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "alumno/vista.html";
    }
  } catch (error) {
    loginError.textContent = "Correo o contraseña incorrectos";
  }
});
