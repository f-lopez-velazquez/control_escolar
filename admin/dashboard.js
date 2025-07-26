import { db, auth } from "../firebase.js";
import {
  collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, updateDoc, setDoc, getDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Logout
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

// --- Equipos ---
const equipoForm = document.getElementById("equipoForm");
const tablaEquipos = document.querySelector("#tablaEquipos tbody");
let equiposList = [];
const loadEquipos = () => {
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  onSnapshot(equiposCol, (snap) => {
    equiposList = [];
    tablaEquipos.innerHTML = "";
    document.getElementById("filtroEquipo").innerHTML = '<option value="">Todos los equipos</option>';
    snap.forEach(docu => {
      const d = { id: docu.id, ...docu.data() };
      equiposList.push(d);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.equipoNum}</td>
        <td>${d.encargado}</td>
        <td>${d.tareas ? d.tareas.join(", ") : ""}</td>
        <td class="table-actions">
          <button onclick="window.eliminarEquipo('${docu.id}')">🗑️</button>
        </td>
      `;
      tablaEquipos.appendChild(tr);

      // Filtro de equipos
      let opt = document.createElement("option");
      opt.value = d.equipoNum;
      opt.textContent = "Equipo " + d.equipoNum;
      document.getElementById("filtroEquipo").appendChild(opt);
    });
  });
};
equipoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const equipoNum = equipoForm.equipoNum.value;
  const equipoDoc = await getDoc(doc(db, `materias/${currentMateria}/equipos`, equipoNum));
  if (equipoDoc.exists()) {
    toast("Ese número de equipo ya existe.", true);
    return;
  }
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  await setDoc(doc(equiposCol, equipoNum), {
    equipoNum,
    encargado: equipoForm.encargado.value,
    tareas: []
  });
  equipoForm.reset();
  toast("Equipo agregado");
};
window.eliminarEquipo = async (id) => {
  if (!currentMateria) return;
  // Valida que ningún alumno tenga asignado este equipo en ningún parcial
  const alumnosSnap = await getDocs(collection(db, `materias/${currentMateria}/alumnos`));
  for (let alumno of alumnosSnap.docs) {
    const equipos = alumno.data().equipos || {};
    for (let p of ["parcial1", "parcial2", "parcial3", "parcial4"]) {
      if (equipos[p] == id) {
        toast("No puedes eliminar este equipo: Hay alumnos asignados en algún parcial.", true);
        return;
      }
    }
  }
  await deleteDoc(doc(db, `materias/${currentMateria}/equipos`, id));
  toast("Equipo eliminado correctamente");
};

// --- Alumnos ---
const alumnoForm = document.getElementById("alumnoForm");
const tablaAlumnos = document.querySelector("#tablaAlumnos tbody");
const filtroEquipo = document.getElementById("filtroEquipo");
const parcialAsignar = document.getElementById("parcialAsignar");
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
    });

    // Render alumnos
    renderAlumnos();
    updateAlumnosInEvaluacion();
    updateAlumnosInDeduccion();
  });
};

function renderAlumnos() {
  tablaAlumnos.innerHTML = "";
  let equipoFiltro = filtroEquipo.value;
  alumnosData
    .filter(a => {
      if (!equipoFiltro) return true;
      const eqs = a.equipos || {};
      return Object.values(eqs).includes(equipoFiltro);
    })
    .forEach(d => {
      const equiposStr = ["parcial1", "parcial2", "parcial3", "parcial4"]
        .map(p => `<strong>${p.replace("parcial", "P")}:</strong> ${d.equipos && d.equipos[p] ? d.equipos[p] : "-"}`)
        .join("<br>");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.numLista}</td>
        <td>${d.nombreCompleto}</td>
        <td>${equiposStr}</td>
        <td class="table-actions">
          <button onclick="window.eliminarAlumno('${d.id}')">🗑️</button>
        </td>
      `;
      tablaAlumnos.appendChild(tr);
    });
}
window.eliminarAlumno = async (id) => {
  if (!currentMateria) return;
  await deleteDoc(doc(db, `materias/${currentMateria}/alumnos`, id));
  toast("Alumno eliminado");
};

async function validarEquipoExistente(equipoNum) {
  const equipoDoc = await getDoc(doc(db, `materias/${currentMateria}/equipos`, equipoNum));
  return equipoDoc.exists();
}

// --- Agregar/Actualizar Alumno (por parcial) ---
alumnoForm.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const numLista = alumnoForm.numLista.value.trim();
  const nombreCompleto = alumnoForm.nombreCompleto.value.trim();
  const equipoNum = alumnoForm.numEquipo.value.trim();
  const parcial = parcialAsignar.value;

  if (!(await validarEquipoExistente(equipoNum))) {
    toast("El equipo no existe. Primero créalo.", true);
    return;
  }

  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  const alumnosSnap = await getDocs(alumnosCol);
  let found = null;
  alumnosSnap.forEach(d => {
    if (d.data().numLista === numLista) found = { id: d.id, ...d.data() };
  });

  if (found) {
    let equipos = found.equipos || {};
    equipos[parcial] = equipoNum;
    await updateDoc(doc(alumnosCol, found.id), {
      nombreCompleto,
      equipos
    });
    toast("Alumno actualizado");
  } else {
    let equipos = {};
    equipos[parcial] = equipoNum;
    await addDoc(alumnosCol, {
      numLista,
      nombreCompleto,
      equipos
    });
    toast("Alumno agregado");
  }
  alumnoForm.reset();
};

filtroEquipo.onchange = () => renderAlumnos();

// --- Evaluaciones ---
const evaluacionForm = document.getElementById("evaluacionForm");
const tablaEvaluaciones = document.querySelector("#tablaEvaluaciones tbody");
const alumnoEval = document.getElementById("alumnoEval");
const parcialEval = document.getElementById("parcialEval");
const calificacionEval = document.getElementById("calificacionEval");

const loadEvaluaciones = async () => {
  if (!currentMateria) return;
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
    const deduccionesCol = collection(db, `materias/${currentMateria}/deducciones`);
    const extrasCol = collection(db, `materias/${currentMateria}/extras`);
    const deduccionesSnap = await getDocs(deduccionesCol);
    const extrasSnap = await getDocs(extrasCol);

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

      // Deducciones y extras por alumno
      let deducciones = [];
      let extras = [];
      deduccionesSnap.forEach(dd => {
        if (dd.data().alumnoId === docu.id) deducciones.push(dd.data());
      });
      extrasSnap.forEach(dd => {
        if (dd.data().alumnoId === docu.id) extras.push(dd.data());
      });

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${d.numLista}</td>
        <td>${d.nombreCompleto}</td>
        <td>${parciales[0]}</td>
        <td>${parciales[1]}</td>
        <td>${parciales[2]}</td>
        <td>${parciales[3]}</td>
        <td>${final}</td>
        <td>
          ${deducciones.map(de => `
            <div class="deduccion-row">${de.parcial}: -${de.cantidad} (${de.motivo})<br><span style="font-size:0.89em">${de.fecha}</span></div>
          `).join("")}
        </td>
        <td>
          ${extras.map(ex => `
            <div class="extra-row">${ex.parcial}: +${ex.cantidad} (${ex.motivo})<br><span style="font-size:0.89em">${ex.fecha}</span></div>
          `).join("")}
        </td>
        <td class="table-actions"></td>
      `;
      tablaEvaluaciones.appendChild(tr);
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
  toast("Calificación registrada");
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

// --- Deducciones y extras ---
const formDeduccion = document.getElementById("formDeduccion");
const alumnoDeduccion = document.getElementById("alumnoDeduccion");
const parcialDeduccion = document.getElementById("parcialDeduccion");
const cantidadDeduccion = document.getElementById("cantidadDeduccion");
const motivoDeduccion = document.getElementById("motivoDeduccion");
const tipoDeduccion = document.getElementById("tipoDeduccion");

function updateAlumnosInDeduccion() {
  alumnoDeduccion.innerHTML = "";
  alumnosData.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = `${a.numLista} - ${a.nombreCompleto}`;
    alumnoDeduccion.appendChild(opt);
  });
}

formDeduccion.onsubmit = async e => {
  e.preventDefault();
  if (!currentMateria) return;
  const id = alumnoDeduccion.value;
  const parcial = parcialDeduccion.value;
  const cantidad = Number(cantidadDeduccion.value);
  const motivo = motivoDeduccion.value;
  const fecha = new Date().toLocaleDateString("es-MX") + " " + new Date().toLocaleTimeString("es-MX");
  const col = tipoDeduccion.value === "deduccion"
    ? collection(db, `materias/${currentMateria}/deducciones`)
    : collection(db, `materias/${currentMateria}/extras`);
  await addDoc(col, {
    alumnoId: id,
    parcial,
    cantidad: Math.abs(cantidad),
    motivo,
    fecha
  });
  formDeduccion.reset();
  toast("Registro guardado");
};

// --- Exportar PDF ---
import jsPDF from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js";
import autoTable from "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.7.0/dist/jspdf.plugin.autotable.min.js";
document.getElementById("btnPdf").onclick = async () => {
  if (!currentMateria) return;
  toast("Generando PDF...");
  // Consigue info
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  const evalsCol = collection(db, `materias/${currentMateria}/evaluaciones`);
  const alumnosSnap = await getDocs(alumnosCol);
  const evalsSnap = await getDocs(evalsCol);

  // Estructura para tabla
  const rows = [];
  alumnosSnap.forEach(docu => {
    const d = docu.data();
    const evalDoc = evalsSnap.docs.find(e => e.id === docu.id);
    const evals = evalDoc ? evalDoc.data() : {};
    const parciales = [
      evals.parcial1 || 0, evals.parcial2 || 0,
      evals.parcial3 || 0, evals.parcial4 || 0
    ];
    const final = (
      (parciales[0] + parciales[1] + parciales[2] + parciales[3]) / 4
    ).toFixed(2);
    rows.push([
      d.numLista, d.nombreCompleto,
      parciales[0], parciales[1], parciales[2], parciales[3], final, ""
    ]);
  });

  // PDF
  const docpdf = new jsPDF({ orientation: "landscape" });
  docpdf.setFontSize(14);
  docpdf.text("Lista de Alumnos - " + materiasSelect.options[materiasSelect.selectedIndex].text, 14, 16);

  autoTable(docpdf, {
    head: [[
      "Núm.", "Nombre",
      "P1", "P2", "P3", "P4", "Final", "Firma"
    ]],
    body: rows,
    startY: 22,
    styles: { cellPadding: 3, fontSize: 11 },
    columnStyles: { 7: { cellWidth: 38 } }
  });

  docpdf.save("lista-alumnos.pdf");
  toast("PDF generado");
};

// --- Toast feedback ---
window.toast = function (msg, error) {
  let t = document.createElement("div");
  t.className = "toast";
  t.style.background = error ? "#b71c1c" : "#1976d2";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

// --- Carga inicial ---
function loadEverything() {
  loadAlumnos();
  loadEquipos();
  loadEvaluaciones();
}

loadEverything();
