import { db, auth } from "../firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ----- Logout -----
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "../index.html";
};

// ------ CRUD ALUMNOS ------
const alumnoForm = document.getElementById("alumnoForm");
const tablaBody = document.querySelector("#tablaAlumnos tbody");

const alumnosCol = collection(db, "alumnos");

alumnoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const numLista = alumnoForm.numLista.value.trim();
  const nombreCompleto = alumnoForm.nombreCompleto.value.trim();
  const numEquipo = alumnoForm.numEquipo.value.trim();
  if (numLista && nombreCompleto && numEquipo) {
    await addDoc(alumnosCol, {
      numLista,
      nombreCompleto,
      numEquipo
    });
    alumnoForm.reset();
  }
});

onSnapshot(alumnosCol, (snap) => {
  tablaBody.innerHTML = "";
  snap.forEach(docu => {
    const d = docu.data();
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.numLista}</td>
      <td>${d.nombreCompleto}</td>
      <td>${d.numEquipo}</td>
      <td><button onclick="deleteAlumno('${docu.id}')">🗑️</button></td>
    `;
    tablaBody.appendChild(tr);
  });
});

window.deleteAlumno = async (id) => {
  await deleteDoc(doc(db, "alumnos", id));
};
