// ---- State ----
let entries = [];
let cognatesByEntryId = {};

// ---- Load data from the database ----
async function loadDictionary() {
  try {
    const result = await loadAllEntries();
    entries = result.entries;
    cognatesByEntryId = result.cognatesByEntry;

    populatePosFilter();
    renderEntries(entries);
    document.getElementById("total-count").textContent = entries.length;
  } catch (err) {
    console.error(err);
    document.getElementById("results").innerHTML =
      `<p>Could not load the dictionary. Check that config.js has your real Supabase URL and key.</p>`;
  }
}

function populatePosFilter() {
  const posSet = new Set(entries.map(e => e.part_of_speech).filter(Boolean));
  const select = document.getElementById("pos-filter");
  select.innerHTML = '<option value="">All</option>';
  [...posSet].sort().forEach(pos => {
    const opt = document.createElement("option");
    opt.value = pos;
    opt.textContent = pos;
    select.appendChild(opt);
  });
}

function renderEntries(list) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  list.forEach(entry => {
    const cognates = cognatesByEntryId[entry.id] || [];

    const el = document.createElement("article");
    el.className = "entry";

    el.innerHTML = `
      <span class="word">${escapeHtml(entry.word)}</span>
      <span class="pos">${escapeHtml(entry.part_of_speech || "")}</span>
      <dl>
        ${entry.lemma && entry.lemma !== entry.word ? `<dt>Lemma</dt><dd>${escapeHtml(entry.lemma)}</dd>` : ""}
        ${entry.etymology ? `<dt>Etymology</dt><dd>${escapeHtml(entry.etymology)}</dd>` : ""}
        <dt>Definition (ES)</dt><dd>${escapeHtml(entry.definition_es || "—")}</dd>
        <dt>Definition (EN)</dt><dd>${escapeHtml(entry.definition_en || "—")}</dd>
        ${cognates.length ? `
          <dt>Cognates</dt>
          <dd>
            <ul class="cognates-list">
              ${cognates.map(c => `<li>${escapeHtml(c.language)}: ${escapeHtml(c.form)}${c.notes ? " — " + escapeHtml(c.notes) : ""}</li>`).join("")}
            </ul>
          </dd>` : ""}
        ${entry.notes ? `<dt>Notes</dt><dd>${escapeHtml(entry.notes)}</dd>` : ""}
        ${entry.source ? `<dt>Source</dt><dd>${escapeHtml(entry.source)}</dd>` : ""}
        <dt>Audio</dt><dd>${mediaBlock(entry.audio_status, entry.audio_path, "audio")}</dd>
        <dt>Image</dt><dd>${mediaBlock(entry.image_status, entry.image_path, "image")}</dd>
      </dl>
    `;

    container.appendChild(el);
  });

  document.getElementById("result-count").textContent =
    `${list.length} of ${entries.length} entries shown`;
}

function applyFilters() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const pos = document.getElementById("pos-filter").value;

  const filtered = entries.filter(entry => {
    const matchesQuery = !query || [
      entry.word, entry.lemma, entry.definition_es, entry.definition_en
    ].some(field => field && field.toLowerCase().includes(query));

    const matchesPos = !pos || entry.part_of_speech === pos;

    return matchesQuery && matchesPos;
  });

  renderEntries(filtered);
}

// Renders either a real player/image, or an "unavailable (yet)" note.
function mediaBlock(status, path, kind) {
  if (status !== "available" || !path) {
    return `<span class="media-badge media-unavailable">Unavailable (yet)</span>`;
  }
  const url = mediaPublicUrl(path);
  if (kind === "audio") {
    return `<audio controls src="${url}"></audio>`;
  } else {
    return `<img class="entry-image" src="${url}" alt="">`;
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

document.getElementById("search-input").addEventListener("input", applyFilters);
document.getElementById("pos-filter").addEventListener("change", applyFilters);

loadDictionary();
