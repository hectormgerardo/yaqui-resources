let currentEntries = [];
let currentCognatesByEntry = {};
let editingId = null; // null = new entry
let pendingAudioFile = null;
let pendingImageFile = null;

// ============================================================
// Auth gate
// ============================================================

async function checkAuth() {
  const session = await getSession();
  showEditorIfLoggedIn(session);
}

function showEditorIfLoggedIn(session) {
  const loggedIn = !!session;
  document.getElementById("login-panel").hidden = loggedIn;
  document.getElementById("editor-area").hidden = !loggedIn;
  if (loggedIn) init();
}

onAuthChange((session) => showEditorIfLoggedIn(session));

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  try {
    await signIn(email, password);
  } catch (err) {
    errorEl.textContent = "Login failed: " + err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut();
});

checkAuth();

// ============================================================
// Editor
// ============================================================

async function init() {
  const result = await loadAllEntries();
  currentEntries = result.entries;
  currentCognatesByEntry = result.cognatesByEntry;
  populateExistingSelect();
  addCognateRow();
}

function populateExistingSelect() {
  const select = document.getElementById("existing-entry-select");
  select.innerHTML = '<option value="">— New entry —</option>';
  currentEntries
    .slice()
    .sort((a, b) => a.word.localeCompare(b.word))
    .forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = `${e.word} (${e.part_of_speech || "?"})`;
      select.appendChild(opt);
    });
}

document.getElementById("existing-entry-select").addEventListener("change", (e) => {
  const id = e.target.value;
  if (!id) {
    clearForm();
    return;
  }
  loadEntryIntoForm(id);
});

function loadEntryIntoForm(id) {
  const entry = currentEntries.find(e => e.id === id);
  if (!entry) return;

  editingId = id;
  pendingAudioFile = null;
  pendingImageFile = null;

  document.getElementById("f-word").value = entry.word || "";
  document.getElementById("f-lemma").value = entry.lemma || "";
  document.getElementById("f-pos").value = entry.part_of_speech || "";
  document.getElementById("f-etymology").value = entry.etymology || "";
  document.getElementById("f-def-es").value = entry.definition_es || "";
  document.getElementById("f-def-en").value = entry.definition_en || "";
  document.getElementById("f-notes").value = entry.notes || "";
  document.getElementById("f-source").value = entry.source || "";

  document.getElementById("current-audio").textContent =
    entry.audio_status === "available" && entry.audio_path
      ? `Current: ${entry.audio_path} (uploading a new file will replace it)`
      : "No audio file yet.";
  document.getElementById("current-image").textContent =
    entry.image_status === "available" && entry.image_path
      ? `Current: ${entry.image_path} (uploading a new file will replace it)`
      : "No image file yet.";
  document.getElementById("f-audio-file").value = "";
  document.getElementById("f-image-file").value = "";

  const cognates = currentCognatesByEntry[id] || [];
  const rowsContainer = document.getElementById("cognates-rows");
  rowsContainer.innerHTML = "";
  if (cognates.length === 0) {
    addCognateRow();
  } else {
    cognates.forEach(c => addCognateRow(c));
  }
}

function clearForm() {
  editingId = null;
  pendingAudioFile = null;
  pendingImageFile = null;
  document.getElementById("entry-form").reset();
  document.getElementById("existing-entry-select").value = "";
  document.getElementById("current-audio").textContent = "No audio file yet.";
  document.getElementById("current-image").textContent = "No image file yet.";
  const rowsContainer = document.getElementById("cognates-rows");
  rowsContainer.innerHTML = "";
  addCognateRow();
}

document.getElementById("clear-form-btn").addEventListener("click", clearForm);

document.getElementById("f-audio-file").addEventListener("change", (e) => {
  pendingAudioFile = e.target.files[0] || null;
});
document.getElementById("f-image-file").addEventListener("change", (e) => {
  pendingImageFile = e.target.files[0] || null;
});

// ---- Cognate rows ----

function addCognateRow(data) {
  data = data || { language: "", form: "", notes: "" };
  const rowsContainer = document.getElementById("cognates-rows");

  const row = document.createElement("div");
  row.className = "cognate-row";
  row.innerHTML = `
    <input type="text" class="cog-language" placeholder="Language" value="${escapeAttr(data.language)}">
    <input type="text" class="cog-form" placeholder="Form" value="${escapeAttr(data.form)}">
    <input type="text" class="cog-notes" placeholder="Notes (optional)" value="${escapeAttr(data.notes)}">
    <button type="button" class="remove-cognate-row">Remove</button>
  `;
  row.querySelector(".remove-cognate-row").addEventListener("click", () => row.remove());
  rowsContainer.appendChild(row);
}

document.getElementById("add-cognate-row").addEventListener("click", () => addCognateRow());

function collectCognates() {
  return [...document.querySelectorAll(".cognate-row")]
    .map(row => ({
      language: row.querySelector(".cog-language").value.trim(),
      form: row.querySelector(".cog-form").value.trim(),
      notes: row.querySelector(".cog-notes").value.trim()
    }))
    .filter(c => c.language || c.form);
}

function escapeAttr(str) {
  return String(str || "").replaceAll('"', "&quot;");
}

// ---- Save ----

document.getElementById("entry-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("save-status");
  statusEl.hidden = false;
  statusEl.textContent = "Saving...";

  try {
    const existing = editingId ? currentEntries.find(en => en.id === editingId) : null;

    const entry = {
      word: document.getElementById("f-word").value.trim(),
      lemma: document.getElementById("f-lemma").value.trim() || document.getElementById("f-word").value.trim(),
      part_of_speech: document.getElementById("f-pos").value.trim(),
      etymology: document.getElementById("f-etymology").value.trim(),
      definition_es: document.getElementById("f-def-es").value.trim(),
      definition_en: document.getElementById("f-def-en").value.trim(),
      notes: document.getElementById("f-notes").value.trim(),
      source: document.getElementById("f-source").value.trim(),
      audio_status: existing ? existing.audio_status : "unavailable",
      audio_path: existing ? existing.audio_path : null,
      image_status: existing ? existing.image_status : "unavailable",
      image_path: existing ? existing.image_path : null
    };
    if (editingId) entry.id = editingId;

    // Upload any newly chosen files, then point the entry at them.
    if (pendingAudioFile) {
      statusEl.textContent = "Uploading audio...";
      entry.audio_path = await uploadMediaFile(pendingAudioFile, "audio");
      entry.audio_status = "available";
    }
    if (pendingImageFile) {
      statusEl.textContent = "Uploading image...";
      entry.image_path = await uploadMediaFile(pendingImageFile, "images");
      entry.image_status = "available";
    }

    statusEl.textContent = "Saving entry...";
    const cognates = collectCognates();
    const savedId = await upsertEntry(entry, cognates);

    const result = await loadAllEntries();
    currentEntries = result.entries;
    currentCognatesByEntry = result.cognatesByEntry;
    populateExistingSelect();
    document.getElementById("existing-entry-select").value = savedId;
    editingId = savedId;
    pendingAudioFile = null;
    pendingImageFile = null;

    statusEl.textContent = "Saved.";
    setTimeout(() => statusEl.hidden = true, 3000);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Save failed: " + err.message;
  }
});

// ---- Import ----

document.getElementById("import-btn").addEventListener("click", async () => {
  const fileInput = document.getElementById("import-file");
  const resultEl = document.getElementById("import-result");

  if (!fileInput.files.length) {
    resultEl.textContent = "Choose a .csv or .xlsx file first.";
    return;
  }

  resultEl.textContent = "Importing...";
  try {
    const rows = await readSpreadsheetFile(fileInput.files[0]);
    const count = await importRows(rows);
    resultEl.textContent = `Imported ${count} row(s).`;

    const result = await loadAllEntries();
    currentEntries = result.entries;
    currentCognatesByEntry = result.cognatesByEntry;
    populateExistingSelect();
  } catch (err) {
    console.error(err);
    resultEl.textContent = "Import failed: " + err.message;
  }
});
