import { db, auth } from "../firebase.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- Logout ----
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "../index.html";
};

// --- Materias ---
const materiaForm = document.getElementById("materiaForm");
const materiasSelect = document.getElementById("materiasSelect");

let currentMateria = null;
let materiasList = [];

// Actualiza la UI según la materia seleccionada
function mostrarSeccionesMateria(show) {
  ["seccionRubros", "seccionAlumnos", "seccionEquipos", "seccionParciales", "seccionFinal"].forEach(id => {
    document.getElementById(id).style.display = show ? "" : "none";
  });
}

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
    mostrarSeccionesMateria(true);
  } else {
    mostrarSeccionesMateria(false);
  }
});
materiasSelect.onchange = () => {
  currentMateria = materiasSelect.value;
  loadEverything();
};

materiaForm.onsubmit = async e => {
  e.preventDefault();
  await addDoc(materiasCol, { nombre: materiaForm.nombreMateria.value, rubrica: [] });
  materiaForm.reset();
};

// --- Rubros por materia ---
const formRubro = document.getElementById("formRubro");
const nombreRubro = document.getElementById("nombreRubro");
const pesoRubro = document.getElementById("pesoRubro");
const tipoRubro = document.getElementById("tipoRubro");
const listaRubros = document.getElementById("listaRubros");
const totalRubros = document.getElementById("totalRubros");

let rubros = [];

async function loadRubros() {
  if (!currentMateria) return;
  const materiaDoc = await getDoc(doc(db, "materias", currentMateria));
  rubros = materiaDoc.exists() ? (materiaDoc.data().rubrica || []) : [];
  renderRubros();
}

function renderRubros() {
  listaRubros.innerHTML = "";
  let total = 0;
  rubros.forEach((r, idx) => {
    total += Number(r.peso);
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${r.nombre}</b> (${r.peso} pts, ${r.tipo === "ind" ? "Individual" : "Equipo"})
      <button onclick="window.eliminarRubro(${idx})">🗑️</button>
    `;
    listaRubros.appendChild(li);
  });
  totalRubros.textContent = total;
}
window.eliminarRubro = async (idx) => {
  rubros.splice(idx, 1);
  await updateDoc(doc(db, "materias", currentMateria), { rubrica: rubros });
  loadRubros();
};

formRubro.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  let peso = parseFloat(pesoRubro.value);
  let total = rubros.reduce((acc, r) => acc + Number(r.peso), 0) + peso;
  if (total > 10) {
    alert("La suma de los rubros no puede exceder 10.");
    return;
  }
  rubros.push({
    nombre: nombreRubro.value,
    peso,
    tipo: tipoRubro.value
  });
  await updateDoc(doc(db, "materias", currentMateria), { rubrica: rubros });
  formRubro.reset();
  loadRubros();
};

// --- Alumnos ---
const alumnoForm = document.getElementById("alumnoForm");
const tablaAlumnos = document.getElementById("tablaAlumnos").querySelector("tbody");
let alumnosList = [];

async function loadAlumnos() {
  if (!currentMateria) return;
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  onSnapshot(alumnosCol, (snap) => {
    alumnosList = [];
    tablaAlumnos.innerHTML = "";
    snap.forEach(docu => {
      let d = { id: docu.id, ...docu.data() };
      alumnosList.push(d);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.numLista}</td>
        <td>${d.nombreCompleto}</td>
        <td><button onclick="window.eliminarAlumno('${d.id}')">🗑️</button></td>
      `;
      tablaAlumnos.appendChild(tr);
    });
  });
}
alumnoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  await addDoc(alumnosCol, {
    numLista: alumnoForm.numLista.value,
    nombreCompleto: alumnoForm.nombreCompleto.value
  });
  alumnoForm.reset();
};
window.eliminarAlumno = async (id) => {
  if (!currentMateria) return;
  await deleteDoc(doc(db, `materias/${currentMateria}/alumnos`, id));
};

// --- Equipos ---
const equipoForm = document.getElementById("equipoForm");
const tablaEquipos = document.getElementById("tablaEquipos").querySelector("tbody");
let equiposList = [];

async function loadEquipos() {
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  onSnapshot(equiposCol, (snap) => {
    equiposList = [];
    tablaEquipos.innerHTML = "";
    snap.forEach(docu => {
      let d = { id: docu.id, ...docu.data() };
      equiposList.push(d);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.equipoNum}</td>
        <td>${d.encargado}</td>
        <td>${d.trabajos ? JSON.stringify(d.trabajos) : ""}</td>
        <td><button onclick="window.eliminarEquipo('${d.id}')">🗑️</button></td>
      `;
      tablaEquipos.appendChild(tr);
    });
  });
}
equipoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  await addDoc(equiposCol, {
    equipoNum: equipoForm.equipoNum.value,
    encargado: equipoForm.encargado.value,
    trabajos: {}
  });
  equipoForm.reset();
};
window.eliminarEquipo = async (id) => {
  if (!currentMateria) return;
  await deleteDoc(doc(db, `materias/${currentMateria}/equipos`, id));
};

// --- Parciales (Evaluación) ---
const selectParcial = document.getElementById("selectParcial");
const areaParcial = document.getElementById("areaParcial");

selectParcial.onchange = loadParcial;
async function loadParcial() {
  if (!currentMateria) return;
  let numParcial = selectParcial.value;
  areaParcial.innerHTML = "";

  // Tabla de alumnos y rubros (editable)
  let html = `<table style="width:100%;max-width:1200px;"><thead><tr>
    <th>Lista</th><th>Nombre</th>`;
  rubros.forEach(r => { html += `<th>${r.nombre}<br>(${r.peso})</th>`; });
  html += `<th>Equipo</th><th>Total</th><th>Acciones</th></tr></thead><tbody>`;
  for (let alumno of alumnosList) {
    html += `<tr><td>${alumno.numLista}</td><td>${alumno.nombreCompleto}</td>`;
    for (let i = 0; i < rubros.length; i++) {
      html += `<td><input style="width:60px" type="number" min="0" max="${rubros[i].peso}" step="0.1" 
      value="" data-alumno="${alumno.id}" data-rubro="${i}" /></td>`;
    }
    html += `<td><input style="width:60px" type="number" min="1" step="1" placeholder="Eq" data-alumno-eq="${alumno.id}" /></td>`;
    html += `<td id="total-${alumno.id}"></td>`;
    html += `<td><button onclick="window.guardarParcial('${alumno.id}')">Guardar</button></td></tr>`;
  }
  html += `</tbody></table>`;
  areaParcial.innerHTML = html;
}

window.guardarParcial = async (alumnoId) => {
  if (!currentMateria) return;
  let numParcial = selectParcial.value;
  let inputs = areaParcial.querySelectorAll(`input[data-alumno="${alumnoId}"]`);
  let eqInput = areaParcial.querySelector(`input[data-alumno-eq="${alumnoId}"]`);
  let calif = {};
  let total = 0;
  for (let i = 0; i < inputs.length; i++) {
    let v = Number(inputs[i].value);
    calif[rubros[i].nombre] = v;
    total += v;
  }
  let eq = eqInput.value || "";
  calif.equipo = eq;
  calif.total = total;
  await setDoc(doc(db, `materias/${currentMateria}/parciales`, numParcial), {
    [`alumnos.${alumnoId}`]: calif
  }, { merge: true });
  alert("Parcial guardado para el alumno " + alumnoId);
};

// --- Final ---
const btnCalcularFinal = document.getElementById("btnCalcularFinal");
const tablaFinal = document.getElementById("tablaFinal").querySelector("tbody");

btnCalcularFinal.onclick = async () => {
  if (!currentMateria) return;
  let proms = {};
  for (let alumno of alumnosList) {
    let sum = 0, count = 0;
    for (let i = 1; i <= 4; i++) {
      const parcDoc = await getDoc(doc(db, `materias/${currentMateria}/parciales`, ""+i));
      let calif = parcDoc.exists() && parcDoc.data().alumnos && parcDoc.data().alumnos[alumno.id];
      if (calif && calif.total) {
        sum += Number(calif.total);
        count++;
      }
    }
    proms[alumno.id] = count > 0 ? (sum / count).toFixed(2) : "";
  }
  await setDoc(doc(db, `materias/${currentMateria}/final`, "alumnos"), proms, { merge: true });
  renderFinal(proms);
};

async function renderFinal(proms) {
  tablaFinal.innerHTML = "";
  for (let alumno of alumnosList) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${alumno.numLista}</td><td>${alumno.nombreCompleto}</td><td>${proms[alumno.id] || ""}</td>`;
    tablaFinal.appendChild(tr);
  }
}

// --- PDF export (básico) ---
document.getElementById("btnPdf").onclick = async () => {
  if (!currentMateria) return;
  alert("Función PDF pendiente: aquí puedes integrar jsPDF o Table2Excel usando la estructura de la tabla final.");
};

// --- Carga global ---
function loadEverything() {
  loadRubros();
  loadAlumnos();
  loadEquipos();
  loadParcial();
}
