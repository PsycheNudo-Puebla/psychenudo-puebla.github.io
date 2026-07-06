// ============================================================
// examen-files.js — Carga y gestión de archivos
// ============================================================

async function loadDefaultExamFiles() {
  try {
    const timestamp = Date.now();
    const response = await fetch(`examen_ejemplo.json?t=${timestamp}`);
    if (response.ok) {
      const data = await response.json();
      currentExam = normalizeExam(data);
    } else {
      currentExam = normalizeExam(defaultTemplate);
    }
    populateEditor();
    updateStatus(`Examen cargado: ${currentExam.titulo}.`);
    setEditStatus(`Listo para editar: ${currentExam.titulo}.`);
  } catch (error) {
    setEditStatus("Puedes crear uno nuevo o cargar un JSON.");
    updateStatus("Listo para cargar un examen.", false);
  }
}

async function loadExamFile(file, isApplyMode) {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    currentExam = normalizeExam(parsed);
    populateEditor();
    currentExamFileName = file.name || "examen_local.json";
    if (isApplyMode) {
      updateStatus(`Examen cargado desde ${file.name}.`);
      showExamStage("welcome");
    } else {
      setEditStatus(`Examen cargado desde ${file.name} y listo para editar.`);
    }
  } catch (error) {
    if (isApplyMode) updateStatus(`No se pudo leer el archivo: ${error.message}`, true);
    else setEditStatus(`No se pudo leer el archivo: ${error.message}`, true);
  }
}

async function discoverKnownJsonFiles() {
  let knownNames = ["config_examen.json", "banco_preguntas.json", "examen_ejemplo.json"];
  try {
    const res = await fetch("examenes.json", { cache: "no-store" });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) knownNames = [...new Set([...knownNames, ...list])];
    }
  } catch (e) { 
    console.warn("No se encontró examenes.json, usando lista por defecto."); 
  }

  const discovered = [];
  for (const name of knownNames) {
    try {
      const response = await fetch(name, { cache: "no-store" });
      if (response.ok) discovered.push({ name, relativePath: name, url: new URL(name, window.location.href).href });
    } catch (error) {
      // Ignorar archivos que no existan
    }
  }
  return discovered;
}

async function discoverAvailableExamsFromServer() {
  const candidates = [
    new URL("./", window.location.href).href,
    new URL("./", window.location.href.replace(/index\.html$/i, "")).href
  ];
  const discovered = new Set();
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { cache: "no-store" });
      if (!response.ok) continue;
      const html = await response.text();
      const matches = [...html.matchAll(/href=["']([^"']+)["']/g)]
        .map((match) => match[1])
        .filter((href) => /\.json$/i.test(href));
      matches.forEach((href) => discovered.add(decodeURIComponent(href.split("/").pop())));
    } catch (error) {
      console.warn("No se pudo leer la carpeta del servidor", error);
    }
  }
  return [...discovered].sort();
}

async function openFolderAndListExams() {
  try {
    const knownFiles = await discoverKnownJsonFiles();
    if (knownFiles.length) {
      elements.folderList.innerHTML = "";
      renderFolderFileList(knownFiles, false);
      updateStatus(`Se encontraron ${knownFiles.length} examen(es) JSON disponibles en la carpeta del proyecto.`);
      return;
    }
  } catch (error) {
    console.warn("No se pudo listar archivos conocidos del proyecto", error);
  }

  try {
    const discoveredFiles = await discoverAvailableExamsFromServer();
    if (discoveredFiles.length) {
      const items = discoveredFiles.map((name) => ({
        name,
        relativePath: name,
        url: new URL(name, window.location.href).href
      }));
      renderFolderFileList(items, false);
      updateStatus(`Sincronizado con el servidor: ${discoveredFiles.length} examen(es) detectados.`);
      return;
    }
  } catch (error) {
    console.warn("No se pudo listar la carpeta desde el servidor", error);
  }

  if (window.showDirectoryPicker) {
    try {
      currentDirectoryHandle = await window.showDirectoryPicker();
      const files = [];
      for await (const entry of currentDirectoryHandle.values()) {
        if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json")) {
          files.push(entry.name);
        }
      }
      renderFolderFileList(files.map((name) => ({ name, relativePath: name })), true);
      updateStatus(`Carpeta abierta. Se encontraron ${files.length} examen(es) JSON.`);
      return;
    } catch (error) {
      console.warn("No se seleccionó una carpeta", error);
    }
  }

  document.getElementById("folder-file-input").click();
}

function handleFolderFilesSelection(event) {
  const selectedFiles = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith(".json"));
  if (!selectedFiles.length) {
    elements.folderList.innerHTML = '<p class="muted">No se encontraron archivos JSON válidos en la carpeta seleccionada.</p>';
    return;
  }
  renderFolderFileList(selectedFiles.map((file) => ({
    name: file.name,
    relativePath: file.webkitRelativePath || file.name,
    file
  })), false);
  updateStatus(`Se encontraron ${selectedFiles.length} archivo(s) JSON válidos.`);
  event.target.value = "";
}

function renderFolderFileList(items, useDirectoryHandle) {
  if (!items.length) {
    elements.folderList.innerHTML = '<p class="muted">No se encontraron archivos JSON en la carpeta seleccionada.</p>';
    return;
  }
  elements.folderList.innerHTML = '<h3>Exámenes disponibles</h3>' + items.map((item, index) => `
    <div class="list-item">
      <span>${escapeHtml(item.relativePath || item.name)}</span>
      <button class="secondary" data-file-index="${index}" data-file-name="${escapeAttribute(item.name)}">Cargar</button>
    </div>`).join("");
  elements.folderList.querySelectorAll("button[data-file-name]").forEach((button) => button.addEventListener("click", async () => {
    const index = Number(button.getAttribute("data-file-index"));
    const fileName = button.getAttribute("data-file-name");
    const item = items[index];
    if (useDirectoryHandle) {
      const fileHandle = await currentDirectoryHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      loadExamFile(file, true);
    } else if (item?.url) {
      try {
        const response = await fetch(item.url, { cache: "no-store" });
        const blob = await response.blob();
        const file = new File([blob], item.name, { type: "application/json" });
        loadExamFile(file, true);
      } catch (error) {
        updateStatus(`No se pudo cargar ${item.name} desde la carpeta del proyecto.`, true);
      }
    } else {
      const file = item?.file;
      if (file) {
        loadExamFile(file, true);
      }
    }
  }));
}

function downloadTemplate() {
  downloadJsonFile(defaultTemplate, "plantilla_examen.json");
}

function downloadCurrentExam() {
  const payload = serializeCurrentExam();
  downloadJsonFile(payload, currentExamFileName);
  setEditStatus(`Examen descargado como ${currentExamFileName}.`);
}

function downloadLatestResultJson() {
  if (!latestResultPayload) {
    elements.resultsImportStatus.textContent = "No hay resultados disponibles para descargar aún.";
    updateStatus("No hay resultados disponibles para descargar aún.", true);
    return;
  }
  const filename = `${(latestResultPayload.studentName || "estudiante").replace(/\s+/g, "_")}_resultado.json`;
  downloadJsonFile(latestResultPayload, filename);
  updateStatus(`Resultados exportados como ${filename}.`);
}

async function handleImportedResultsSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    latestResultPayload = normalizeResultPayload(parsed);
    renderImportedResults(latestResultPayload);
    elements.resultsImportStatus.textContent = `Resultados cargados desde ${file.name}.`;
    updateStatus(`Resultados cargados desde ${file.name}.`);
    event.target.value = "";
  } catch (error) {
    elements.resultsImportStatus.textContent = `No se pudo leer el archivo: ${error.message}`;
    updateStatus(`No se pudo leer el archivo: ${error.message}`, true);
    event.target.value = "";
  }
}
