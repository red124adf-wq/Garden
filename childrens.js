/* ======================================================
   SUPABASE INIT + AUTH GUARD
====================================================== */

const SUPABASE_URL = "https://wesibzuxkytajteyejmw.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U";

if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

async function requireAuth() {
  const { data, error } = await window.supabaseClient.auth.getUser();

  if (error || !data?.user) {
    window.location.href = "index.html";
    return false;
  }

  window.currentUser = data.user;
  return true;
}

/* ======================================================
   APP
====================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  const isAuth = await requireAuth();
  if (!isAuth) return;

  /* ---------- DOM ---------- */
  const form = document.getElementById("childForm");
  const childIdInput = document.getElementById("childId");

  const modal = document.getElementById("searchModal");
  const openSearchBtn = document.getElementById("openSearchBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const resultsList = document.getElementById("searchResults");

  const filters = {
    last: document.getElementById("f_last_name"),
    first: document.getElementById("f_first_name"),
    middle: document.getElementById("f_middle_name"),
    birth: document.getElementById("f_birth_date"),
    cert: document.getElementById("f_certificate"),
  };

  let selectedChild = null;

  /* ======================================================
     SEARCH MODAL
  ====================================================== */

  openSearchBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    runSearch();
  });

  cancelBtn.addEventListener("click", closeSearch);
  confirmBtn.addEventListener("click", applySelectedChild);

  Object.values(filters).forEach(input =>
    input.addEventListener("input", runSearch)
  );

  async function runSearch() {
    let query = window.supabaseClient
      .from("childrens")
      .select("*")
      .order("last_name", { ascending: true })
      .limit(5);

    if (filters.last.value)
      query = query.ilike("last_name", `%${filters.last.value}%`);

    if (filters.first.value)
      query = query.ilike("first_name", `%${filters.first.value}%`);

    if (filters.middle.value)
      query = query.ilike("middle_name", `%${filters.middle.value}%`);

    if (filters.birth.value)
      query = query.eq("birth_date", filters.birth.value);

    if (filters.cert.value)
      query = query.ilike(
        "birth_certificate",
        `%${filters.cert.value}%`
      );

    const { data, error } = await query;

    if (error) {
      console.error("Search error:", error);
      return;
    }

    resultsList.innerHTML = "";
    selectedChild = null;

    data.forEach(child => {
      const li = document.createElement("li");
      li.textContent = `${child.last_name} ${child.first_name} ${
        child.middle_name || ""
      } (${child.birth_date})`;

      li.addEventListener("click", () => {
        selectedChild = child;
        [...resultsList.children].forEach(el =>
          el.classList.remove("active")
        );
        li.classList.add("active");
      });

      resultsList.appendChild(li);
    });
  }

  function applySelectedChild() {
    if (!selectedChild) return;

    childIdInput.value = selectedChild.id;

    Object.keys(selectedChild).forEach(key => {
      const field = form.elements[key];
      if (!field) return;

      if (field.type === "checkbox") {
  field.checked = Boolean(selectedChild[key]);
} else if (field.type === "radio") {
  field.checked = field.value === selectedChild[key];
} else {
  field.value = selectedChild[key] ?? "";
}
    });

    closeSearch();
  }

  function closeSearch() {
    modal.classList.add("hidden");
    selectedChild = null;
  }

  /* ======================================================
     FORM SUBMIT (INSERT / UPDATE)
  ====================================================== */

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const formData = new FormData(form);
    const payload = {};

    formData.forEach((value, key) => {
      if (key === "id") return;
      payload[key] = value === "" ? null : value;
    });

    form.querySelectorAll("input[type='checkbox']").forEach(cb => {
      payload[cb.name] = cb.checked;
    });

    const id = childIdInput.value;

    let result;
    if (id) {
      result = await window.supabaseClient
        .from("childrens")
        .update(payload)
        .eq("id", id);
    } else {
      result = await window.supabaseClient
        .from("childrens")
        .insert([payload]);
    }

    if (result.error) {
      console.error("Save error:", result.error);
      alert("❌ Помилка збереження");
      return;
    }

    alert("✅ Дані успішно збережено");
    form.reset();
    childIdInput.value = "";
  });
});
