const owner = "Pausiar";
const repo = "Amplya-In-Out";
const branch = "main";
const apkFolder = "apk";
const apkList = document.getElementById("apk-list");

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

function renderMessage(message) {
  apkList.innerHTML = "";
  const row = document.createElement("div");
  row.className = "apk-row apk-row-message";
  row.textContent = message;
  apkList.appendChild(row);
}

function createApkRow(apk) {
  const row = document.createElement("article");
  row.className = "apk-row";
  row.setAttribute("role", "listitem");

  const nameCell = document.createElement("div");
  nameCell.className = "apk-meta";

  const fileName = document.createElement("p");
  fileName.className = "apk-name";
  fileName.textContent = apk.name;

  const uploadDate = document.createElement("p");
  uploadDate.className = "apk-date";
  uploadDate.textContent = `Subida: ${formatDate(apk.uploadedAt)}`;

  const sizeEl = document.createElement("p");
  sizeEl.className = "apk-size" + (apk.size < 1024 ? " apk-size--warn" : "");
  sizeEl.textContent = apk.size < 1024
    ? `⚠️ Tamaño: ${formatSize(apk.size)} — archivo posiblemente incompleto`
    : `Tamaño: ${formatSize(apk.size)}`;

  nameCell.appendChild(fileName);
  nameCell.appendChild(uploadDate);
  nameCell.appendChild(sizeEl);

  const actionCell = document.createElement("div");
  actionCell.className = "apk-action";

  const downloadLink = document.createElement("a");
  downloadLink.className = "download-btn";
  downloadLink.textContent = "Descargar";
  downloadLink.addEventListener("click", async (e) => {
    e.preventDefault();
    downloadLink.textContent = "Descargando...";
    downloadLink.classList.add("download-btn--loading");
    try {
      const response = await fetch(apk.downloadUrl);
      if (!response.ok) throw new Error("Error al descargar el archivo.");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement("a");
      tempLink.href = objectUrl;
      tempLink.download = apk.name;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(objectUrl);
    } catch {
      alert("No se pudo descargar el APK. Inténtalo de nuevo.");
    } finally {
      downloadLink.textContent = "Descargar";
      downloadLink.classList.remove("download-btn--loading");
    }
  });

  actionCell.appendChild(downloadLink);

  row.appendChild(nameCell);
  row.appendChild(actionCell);

  return row;
}

async function getApkFiles() {
  const filesEndpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${apkFolder}?ref=${branch}`;
  const response = await fetch(filesEndpoint);

  if (!response.ok) {
    throw new Error("No se pudo leer la carpeta de APKs.");
  }

  const items = await response.json();
  return items.filter((item) => item.type === "file" && item.name.toLowerCase().endsWith(".apk"));
}

async function getLatestCommitDateForPath(path) {
  const commitsEndpoint = `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&sha=${branch}&per_page=1`;
  const response = await fetch(commitsEndpoint);

  if (!response.ok) {
    throw new Error("No se pudo obtener la fecha de subida.");
  }

  const commits = await response.json();
  if (!Array.isArray(commits) || commits.length === 0) {
    return null;
  }

  return commits[0].commit.committer.date;
}

async function loadApks() {
  renderMessage("Cargando APKs...");

  try {
    const files = await getApkFiles();

    if (files.length === 0) {
      renderMessage("No hay APKs disponibles.");
      return;
    }

    const apksWithDates = await Promise.all(
      files.map(async (file) => {
        const uploadedAt = await getLatestCommitDateForPath(file.path);
        return {
          name: file.name,
          uploadedAt: uploadedAt || "1970-01-01T00:00:00.000Z",
          downloadUrl: file.download_url,
          size: file.size
        };
      })
    );

    apksWithDates.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    apkList.innerHTML = "";
    apksWithDates.forEach((apk) => {
      apkList.appendChild(createApkRow(apk));
    });
  } catch (error) {
    renderMessage("No se pudieron cargar los APKs ahora.");
  }
}

loadApks();
