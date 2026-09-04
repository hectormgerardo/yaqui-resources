// ---- State ----
let entries = [];
let cognatesByEntryId = {};
let categoryOptions = [];
let categoryPaths = {};

// ---- Load data from the database ----
async function loadDictionary() {
  try {
    const result = await loadAllEntries();
    entries = result.entries;
    cognatesByEntryId = result.cognatesByEntry;

    const categories = await loadCategories();
    const built = buildCategoryOptions(categories);
    categoryOptions = built.options;
    categoryPaths = built.pathById;

    populatePosFilter();
    populateCategoryFilter();
    renderEntries(entries);
    document.getElementById("total-count").textContent = entries.length;
  } catch (err) {
    console.error(err);
    document.getElementById("results").innerHTML =
      `<p>Could not load the dictionary. Check that config.js has your real Supabase URL and key.</p>`;
  }
}

function populateCategoryFilter() {
  const select = document.getElementById("category-filter");
  select.innerHTML = '<option value="">All</option>';
  categoryOptions.forEach(opt => {
    const el = document.createElement("option");
    el.value = opt.id;
    el.textContent = opt.label;
    select.appendChild(el);
  });
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
        ${entry.definition_yaq ? `<dt>Definition (Yaqui)</dt><dd>${escapeHtml(entry.definition_yaq)}</dd>` : ""}
        ${entry.category_id && categoryPaths[entry.category_id] ? `<dt>Category</dt><dd>${escapeHtml(categoryPaths[entry.category_id])}</dd>` : ""}
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
  const category = document.getElementById("category-filter").value;

  const filtered = entries.filter(entry => {
    const matchesQuery = !query || [
      entry.word, entry.lemma, entry.definition_es, entry.definition_en, entry.definition_yaq
    ].some(field => field && field.toLowerCase().includes(query));

    const matchesPos = !pos || entry.part_of_speech === pos;
    const matchesCategory = !category || entry.category_id === category;

    return matchesQuery && matchesPos && matchesCategory;
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
document.getElementById("category-filter").addEventListener("change", applyFilters);

loadDictionary();
