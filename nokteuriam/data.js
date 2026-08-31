// ============================================================
// Shared data layer for the Yaqui Dictionary — Supabase edition.
// The database is now the single source of truth (no more
// localStorage merging). Used by both index.html and entry-form.html.
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth ----

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  await supabaseClient.auth.signOut();
}

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session; // null if not logged in
}

function onAuthChange(callback) {
  supabaseClient.auth.onAuthStateChange((_event, session) => callback(session));
}

// ---- Load all entries + cognates ----

async function loadAllEntries() {
  const { data: entries, error: entriesError } = await supabaseClient
    .from("entries")
    .select("*")
    .order("word", { ascending: true });
  if (entriesError) throw entriesError;

  const { data: cognates, error: cognatesError } = await supabaseClient
    .from("cognates")
    .select("*");
  if (cognatesError) throw cognatesError;

  const cognatesByEntry = {};
  cognates.forEach(c => {
    if (!cognatesByEntry[c.entry_id]) cognatesByEntry[c.entry_id] = [];
    cognatesByEntry[c.entry_id].push(c);
  });

  return { entries, cognatesByEntry };
}

// ---- Save (insert or update) one entry + its cognates ----
// entry.id present -> update; absent/null -> insert (DB generates the id).

async function upsertEntry(entry, cognatesList) {
  let entryId = entry.id;

  if (entryId) {
    const { error } = await supabaseClient.from("entries").update(entry).eq("id", entryId);
    if (error) throw error;
  } else {
    const { id, ...entryWithoutId } = entry;
    const { data, error } = await supabaseClient.from("entries").insert(entryWithoutId).select().single();
    if (error) throw error;
    entryId = data.id;
  }

  // Simplest correct strategy: replace all cognates for this entry.
  const { error: deleteError } = await supabaseClient.from("cognates").delete().eq("entry_id", entryId);
  if (deleteError) throw deleteError;

  if (cognatesList.length > 0) {
    const rows = cognatesList.map(c => ({ ...c, entry_id: entryId }));
    const { error: insertError } = await supabaseClient.from("cognates").insert(rows);
    if (insertError) throw insertError;
  }

  return entryId;
}

// ---- File upload to the 'media' storage bucket ----
// folder should be "audio" or "images". Returns the storage path to save on the entry.

async function uploadMediaFile(file, folder) {
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const path = `${folder}/${Date.now()}_${safeName}`;

  const { error } = await supabaseClient.storage.from("media").upload(path, file, { upsert: false });
  if (error) throw error;

  return path;
}

// Turns a stored path into a public URL for playback/display.
function mediaPublicUrl(path) {
  if (!path) return null;
  const { data } = supabaseClient.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// Spreadsheet import (CSV or Excel) — same column format as before,
// now writing straight to the database instead of localStorage.
//
// Columns: word, lemma, part_of_speech, etymology, definition_es,
// definition_en, notes, source, audio_status, audio_path,
// image_status, image_path, cognates
//
// cognates cell format: Language:Form:Notes | Language2:Form2:Notes2
// (Bulk import does not upload files — set audio_path/image_path
// to a path you've already uploaded separately, or leave blank.)
// ============================================================

function parseCognatesCell(cell) {
  if (!cell || !String(cell).trim()) return [];
  return String(cell).split("|").map(chunk => {
    const [language, form, notes] = chunk.split(":").map(s => (s || "").trim());
    return { language: language || "", form: form || "", notes: notes || "" };
  }).filter(c => c.language || c.form);
}

function rowToEntry(row) {
  const entry = {
    word: row.word || "",
    lemma: row.lemma || row.word || "",
    part_of_speech: row.part_of_speech || "",
    etymology: row.etymology || "",
    definition_es: row.definition_es || "",
    definition_en: row.definition_en || "",
    notes: row.notes || "",
    source: row.source || "",
    audio_status: (row.audio_status || "unavailable").trim().toLowerCase() === "available" ? "available" : "unavailable",
    audio_path: row.audio_path || null,
    image_status: (row.image_status || "unavailable").trim().toLowerCase() === "available" ? "available" : "unavailable",
    image_path: row.image_path || null
  };
  const cognates = parseCognatesCell(row.cognates);
  return { entry, cognates };
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = cells[i] || "");
    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

async function readSpreadsheetFile(file) {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  } else {
    const text = await file.text();
    return parseCSV(text);
  }
}

async function importRows(rows) {
  let count = 0;
  for (const row of rows) {
    const { entry, cognates } = rowToEntry(row);
    await upsertEntry(entry, cognates);
    count++;
  }
  return count;
}
