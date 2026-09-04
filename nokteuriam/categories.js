// ============================================================
// Auth gate (same pattern as form.js)
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
// Category management
// ============================================================

async function init() {
  await refresh();
}

async function refresh() {
  const categories = await loadCategories();
  const built = buildCategoryOptions(categories);

  populateParentSelect(built.options);
  renderCategoryTree(built.options, categories);
}

function populateParentSelect(options) {
  const select = document.getElementById("c-parent");
  select.innerHTML = '<option value="">— Top level —</option>';
  options.forEach(opt => {
    const el = document.createElement("option");
    el.value = opt.id;
    el.textContent = opt.label;
    select.appendChild(el);
  });
}

function renderCategoryTree(options, categories) {
  const container = document.getElementById("category-tree");
  if (options.length === 0) {
    container.innerHTML = "<p>No categories yet. Add one above.</p>";
    return;
  }

  const countByCategory = {}; // filled in lazily if you want entry counts later

  container.innerHTML = options.map(opt => `
    <div class="category-row" style="padding-left: ${opt.depth * 20}px;">
      <span>${escapeHtml(opt.label.replace(/^(— )+/, ""))}</span>
      <button type="button" class="delete-category-btn" data-id="${opt.id}">Delete</button>
    </div>
  `).join("");

  container.querySelectorAll(".delete-category-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this category? Entries and subcategories under it will keep their data but lose this category link.")) return;
      await deleteCategory(btn.dataset.id);
      await refresh();
    });
  });
}

document.getElementById("add-category-btn").addEventListener("click", async () => {
  const name = document.getElementById("c-name").value.trim();
  const parentId = document.getElementById("c-parent").value || null;
  const statusEl = document.getElementById("add-category-status");

  if (!name) {
    statusEl.textContent = "Enter a category name first.";
    return;
  }

  try {
    await createCategory(name, parentId);
    document.getElementById("c-name").value = "";
    statusEl.textContent = "Added.";
    setTimeout(() => statusEl.textContent = "", 2000);
    await refresh();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed: " + err.message;
  }
});

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
