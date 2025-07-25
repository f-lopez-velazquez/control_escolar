import { db, auth } from "../firebase.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ----- Logout -----
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "../index.html";
};

// --- Materias ---
const materiaForm = document.getElementById("materiaForm");
const materiasSelect = document.getElementById("materiasSelect");
let currentMateria = null;
let materiasList = [];

const materiasCol = collection(db, "materias");
onSnapshot(materiasCol, (snap) => {
  materiasList = [];
  materiasSelect.innerHTML = "";
  snap.forEach(docu => {
    const m = { id: docu.id, ...docu.data() };
    materiasList.push(m);
    const opt = document.createElement("option");
    opt.value = m.id; opt.textContent = m.nombre;
    materiasSelect.appendChild(opt);
  });
  if (materiasList.length) {
    currentMateria = materiasList[0].id;
    materiasSelect.value = currentMateria;
    loadEverything();
  }
});
materiasSelect.onchange = () => {
  currentMateria = materiasSelect.value;
  loadEverything();
};

materiaForm.onsubmit = async e => {
  e.preventDefault();
  await addDoc(materiasCol, { nombre: materiaForm.nombreMateria.value });
  materiaForm.reset();
};

// --- Alumnos ---
const alumnoForm = document.getElementById("alumnoForm");
const tablaAlumnos = document.querySelector("#tablaAlumnos tbody");
let alumnosData = [];
const loadAlumnos = () => {
  if (!currentMateria) return;
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  onSnapshot(alumnosCol, (snap) => {
    alumnosData = [];
    tablaAlumnos.innerHTML = "";
    snap.forEach(docu => {
      const d = { id: docu.id, ...docu.data() };
      alumnosData.push(d);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.numLista}</td>
        <td>${d.nombreCompleto}</td>
        <td>${d.numEquipo}</td>
        <td class="table-actions">
          <button onclick="window.deleteAlumno('${d.id}')">🗑️</button>
        </td>
      `;
      tablaAlumnos.appendChild(tr);
    });
  });
};
alumnoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  await addDoc(alumnosCol, {
    numLista: alumnoForm.numLista.value,
    nombreCompleto: alumnoForm.nombreCompleto.value,
    numEquipo: alumnoForm.numEquipo.value
  });
  alumnoForm.reset();
};
window.deleteAlumno = async (id) => {
  if (!currentMateria) return;
  await deleteDoc(doc(db, `materias/${currentMateria}/alumnos`, id));
};

// --- Equipos ---
const equipoForm = document.getElementById("equipoForm");
const tablaEquipos = document.querySelector("#tablaEquipos tbody");
const loadEquipos = () => {
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  onSnapshot(equiposCol, (snap) => {
    tablaEquipos.innerHTML = "";
    snap.forEach(docu => {
      const d = docu.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.equipoNum}</td>
        <td>${d.encargado}</td>
        <td>${d.tareas ? d.tareas.join(", ") : ""}</td>
        <td class="table-actions">
          <button onclick="window.deleteEquipo('${docu.id}')">🗑️</button>
        </td>
      `;
      tablaEquipos.appendChild(tr);
    });
  });
};
equipoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  await addDoc(equiposCol, {
    equipoNum: equipoForm.equipoNum.value,
    encargado: equipoForm.encargado.value,
    tareas: []
  });
  equipoForm.reset();
};
window.deleteEquipo = async (id) => {
  if (!currentMateria) return;
  await deleteDoc(doc(db, `materias/${currentMateria}/equipos`, id));
};

function loadEverything() {
  loadAlumnos();
  loadEquipos();
}
