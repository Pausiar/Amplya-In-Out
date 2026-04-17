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

  nameCell.appendChild(fileName);
  nameCell.appendChild(uploadDate);

  const actionCell = document.createElement("div");
  actionCell.className = "apk-action";

  const downloadLink = document.createElement("a");
  downloadLink.className = "download-btn";
  downloadLink.href = apk.downloadUrl;
  downloadLink.download = apk.name;
  downloadLink.textContent = "Descargar";

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
          downloadUrl: file.download_url
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
