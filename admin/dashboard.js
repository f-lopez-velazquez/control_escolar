import { db, auth } from "../firebase.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc, setDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { generatePdf } from "../utils/pdf-generator.js";
import { autoSave } from "../utils/auto-save.js";

// --- Logout ---
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
          <button onclick="window.editAlumno('${d.id}')">✏️</button>
          <button onclick="window.deleteAlumno('${d.id}')">🗑️</button>
        </td>
      `;
      tablaAlumnos.appendChild(tr);
    });
    updateAlumnosInEvaluacion();
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
          <button onclick="window.editEquipo('${docu.id}')">✏️</button>
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

// --- Evaluaciones ---
const evaluacionForm = document.getElementById("evaluacionForm");
const tablaEvaluaciones = document.querySelector("#tablaEvaluaciones tbody");
const alumnoEval = document.getElementById("alumnoEval");
const parcialEval = document.getElementById("parcialEval");
const calificacionEval = document.getElementById("calificacionEval");

const loadEvaluaciones = async () => {
  if (!currentMateria) return;
  // Obtén todos los alumnos
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  const evalsCol = collection(db, `materias/${currentMateria}/evaluaciones`);
  onSnapshot(alumnosCol, (snap) => {
    alumnoEval.innerHTML = "";
    snap.forEach(docu => {
      const d = docu.data();
      const opt = document.createElement("option");
      opt.value = docu.id;
      opt.textContent = `${d.numLista} - ${d.nombreCompleto}`;
      alumnoEval.appendChild(opt);
    });
  });
  onSnapshot(evalsCol, async (snap) => {
    tablaEvaluaciones.innerHTML = "";
    const alumnosSnap = await getDocs(alumnosCol);
    alumnosSnap.forEach(docu => {
      const d = docu.data();
      const evalDoc = snap.docs.find(e => e.id === docu.id);
      const evals = evalDoc ? evalDoc.data() : {};
      const parciales = [
        evals.parcial1 || 0, evals.parcial2 || 0,
        evals.parcial3 || 0, evals.parcial4 || 0
      ];
      const final = (
        (parciales[0] + parciales[1] + parciales[2] + parciales[3]) / 4
      ).toFixed(2);
      tablaEvaluaciones.innerHTML += `
        <tr>
          <td>${d.numLista}</td>
          <td>${d.nombreCompleto}</td>
          <td>${parciales[0]}</td>
          <td>${parciales[1]}</td>
          <td>${parciales[2]}</td>
          <td>${parciales[3]}</td>
          <td>${final}</td>
          <td>${evals.deducciones || 0}</td>
          <td>${evals.puntosExtra || 0}</td>
          <td class="table-actions">
            <button onclick="window.editEvaluacion('${docu.id}')">✏️</button>
            <button onclick="window.deleteEvaluacion('${docu.id}')">🗑️</button>
          </td>
        </tr>
      `;
    });
  });
};
evaluacionForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const evalsCol = collection(db, `materias/${currentMateria}/evaluaciones`);
  await setDoc(doc(evalsCol, alumnoEval.value), {
    [parcialEval.value]: Number(calificacionEval.value)
  }, { merge: true });
  evaluacionForm.reset();
};
function updateAlumnosInEvaluacion() {
  alumnoEval.innerHTML = "";
  alumnosData.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.numLista} - ${a.nombreCompleto}`;
    alumnoEval.appendChild(opt);
  });
}

// --- PDF ---
document.getElementById("generarPdfBtn").onclick = async () => {
  await generatePdf(currentMateria);
};

// --- Exportación de lista ---
document.getElementById("exportarListaBtn").onclick = async () => {
  if (!currentMateria) return;
  // Lógica para exportar solo lista a otra materia
  alert("Función en desarrollo: exporta la lista de alumnos a otra materia.");
};

function loadEverything() {
  loadAlumnos();
  loadEquipos();
  loadEvaluaciones();
}

// --- AutoGuardado cada 15s ---
setInterval(() => {
  autoSave(currentMateria);
}, 15000);

loadEverything();
