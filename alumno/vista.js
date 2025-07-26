import { db } from "../firebase.js";
import { collection, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const materiasSelect = document.getElementById("materiasSelect");
const filtroNumLista = document.getElementById("filtroNumLista");
const btnBuscar = document.getElementById("btnBuscar");
const btnLimpiar = document.getElementById("btnLimpiar");
const tablaAlumnos = document.querySelector("#tablaAlumnos tbody");

let materiasList = [];
let currentMateria = null;
let alumnosGlobal = [];
let equiposGlobal = {};
let deduccionesGlobal = {};
let extrasGlobal = {};

function showLoader(msg = "Cargando...") {
  tablaAlumnos.innerHTML = `<tr><td colspan="14" style="text-align:center;">${msg}</td></tr>`;
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
  }
});

materiasSelect.onchange = () => {
  currentMateria = materiasSelect.value;
  loadEverything();
};

btnBuscar.onclick = () => renderAlumnos();
btnLimpiar.onclick = () => {
  filtroNumLista.value = "";
  renderAlumnos();
};

async function loadEverything() {
  showLoader();
  await loadEquipos();
  await loadDeduccionesExtras();
  await loadAlumnos();
}

async function loadEquipos() {
  equiposGlobal = {};
  if (!currentMateria) return;
  const equiposCol = collection(db, `materias/${currentMateria}/equipos`);
  const snap = await getDocs(equiposCol);
  snap.forEach(docu => {
    const d = docu.data();
    equiposGlobal[d.equipoNum] = d.encargado;
  });
}

async function loadDeduccionesExtras() {
  deduccionesGlobal = {};
  extrasGlobal = {};
  if (!currentMateria) return;
  const dedCol = collection(db, `materias/${currentMateria}/deducciones`);
  const extraCol = collection(db, `materias/${currentMateria}/extras`);
  const [dedSnap, extraSnap] = await Promise.all([getDocs(dedCol), getDocs(extraCol)]);
  dedSnap.forEach(docu => {
    const d = docu.data();
    if (!deduccionesGlobal[d.alumnoId]) deduccionesGlobal[d.alumnoId] = [];
    deduccionesGlobal[d.alumnoId].push(d);
  });
  extraSnap.forEach(docu => {
    const d = docu.data();
    if (!extrasGlobal[d.alumnoId]) extrasGlobal[d.alumnoId] = [];
    extrasGlobal[d.alumnoId].push(d);
  });
}

async function loadAlumnos() {
  if (!currentMateria) return;
  const alumnosCol = collection(db, `materias/${currentMateria}/alumnos`);
  const evalsCol = collection(db, `materias/${currentMateria}/evaluaciones`);

  const alumnosSnap = await getDocs(alumnosCol);
  const evalsSnap = await getDocs(evalsCol);

  alumnosGlobal = [];
  alumnosSnap.forEach(docu => {
    let d = docu.data();
    d.id = docu.id;
    // Consigue sus calificaciones
    const evalDoc = evalsSnap.docs.find(e => e.id === docu.id);
    d.evals = evalDoc ? evalDoc.data() : {};
    alumnosGlobal.push(d);
  });

  renderAlumnos();
}

function renderAlumnos() {
  tablaAlumnos.innerHTML = "";
  let listaFiltro = filtroNumLista.value.trim();
  let alumnos = alumnosGlobal;
  if (listaFiltro !== "") {
    alumnos = alumnos.filter(a => a.numLista === listaFiltro);
    if (!alumnos.length) {
      tablaAlumnos.innerHTML = `<tr><td colspan="14" style="text-align:center;">No se encontró ningún alumno con ese número de lista.</td></tr>`;
      return;
    }
  }
  alumnos.forEach(d => {
    const eq = d.equipos || {};
    const encargados = [
      eq.parcial1 ? equiposGlobal[eq.parcial1] || "-" : "-",
      eq.parcial2 ? equiposGlobal[eq.parcial2] || "-" : "-",
      eq.parcial3 ? equiposGlobal[eq.parcial3] || "-" : "-",
      eq.parcial4 ? equiposGlobal[eq.parcial4] || "-" : "-"
    ];
    const parciales = [
      d.evals.parcial1 || 0,
      d.evals.parcial2 || 0,
      d.evals.parcial3 || 0,
      d.evals.parcial4 || 0
    ];

    // Calcular deducciones y extras por parcial
    let deducP = [0,0,0,0], extraP = [0,0,0,0];
    if (deduccionesGlobal[d.id]) {
      deduccionesGlobal[d.id].forEach(dd => {
        let idx = parseInt(dd.parcial.replace("parcial",""))-1;
        deducP[idx] += Number(dd.cantidad || 0);
      });
    }
    if (extrasGlobal[d.id]) {
      extrasGlobal[d.id].forEach(ex => {
        let idx = parseInt(ex.parcial.replace("parcial",""))-1;
        extraP[idx] += Number(ex.cantidad || 0);
      });
    }
    // Muestra deducciones y extras (con motivo y fecha)
    const deduccionesHtml = (deduccionesGlobal[d.id]||[]).map(dd=>`
      <div class="deduccion-row">${dd.parcial}: -${dd.cantidad} (${dd.motivo})<br><span style="font-size:0.89em">${dd.fecha}</span></div>
    `).join('');
    const extrasHtml = (extrasGlobal[d.id]||[]).map(ex=>`
      <div class="extra-row">${ex.parcial}: +${ex.cantidad} (${ex.motivo})<br><span style="font-size:0.89em">${ex.fecha}</span></div>
    `).join('');

    // Calcula calificación real con extras/deducciones
    const parcialesCorregidos = [
      (parciales[0] + extraP[0] - deducP[0]).toFixed(2),
      (parciales[1] + extraP[1] - deducP[1]).toFixed(2),
      (parciales[2] + extraP[2] - deducP[2]).toFixed(2),
      (parciales[3] + extraP[3] - deducP[3]).toFixed(2)
    ];
    const final = (
      (Number(parcialesCorregidos[0]) + Number(parcialesCorregidos[1]) + Number(parcialesCorregidos[2]) + Number(parcialesCorregidos[3])) / 4
    ).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.numLista}</td>
      <td>${d.nombreCompleto}</td>
      <td>${eq.parcial1 || "-"}</td>
      <td>${eq.parcial2 || "-"}</td>
      <td>${eq.parcial3 || "-"}</td>
      <td>${eq.parcial4 || "-"}</td>
      <td>
        <div>P1: ${encargados[0]}</div>
        <div>P2: ${encargados[1]}</div>
        <div>P3: ${encargados[2]}</div>
        <div>P4: ${encargados[3]}</div>
      </td>
      <td>${parcialesCorregidos[0]}</td>
      <td>${parcialesCorregidos[1]}</td>
      <td>${parcialesCorregidos[2]}</td>
      <td>${parcialesCorregidos[3]}</td>
      <td>${final}</td>
      <td>${deduccionesHtml}</td>
      <td>${extrasHtml}</td>
    `;
    tablaAlumnos.appendChild(tr);
  });
  if (!alumnos.length) {
    tablaAlumnos.innerHTML = `<tr><td colspan="14" style="text-align:center;">No hay alumnos registrados.</td></tr>`;
  }
}
