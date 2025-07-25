import { auth, signInWithEmailAndPassword } from "./firebase.js";

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Acceso administrador por correo específico
    if (user.email === "fco.lopezvelazquez@ugto.mx") {
      window.location.href = "admin/dashboard.html";
    } else {
      window.location.href = "alumno/vista.html";
    }
  } catch (error) {
    loginError.textContent = "Correo o contraseña incorrectos";
  }
});
