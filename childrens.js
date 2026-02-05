/* ======================================================
   AUTH GUARD (ЗАХИСТ СТОРІНКИ)
====================================================== */

// якщо Supabase клієнт ще не створений — створюємо
if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(
        "https://wesibzuxkytajteyejmw.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U" // той самий ключ, що і в app.js
    );
}

(async () => {
    const { data, error } = await window.supabaseClient.auth.getUser();

    if (error || !data?.user) {
        // користувач не авторизований → назад на головну
        window.location.href = "index.html";
        return;
    }

    // якщо треба — можна зберегти користувача
    window.currentUser = data.user;
})();

let selectedChild = null;

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openSearchBtn");
  const modal = document.getElementById("searchModal");
  const form = document.getElementById("childForm");
  const childIdInput = document.getElementById("childId");

  const fLast = document.getElementById("f_last_name");
  const fFirst = document.getElementById("f_first_name");
  const fMiddle = document.getElementById("f_middle_name");
  const fBirth = document.getElementById("f_birth_date");
  const fCert = document.getElementById("f_certificate");

  const results = document.getElementById("searchResults");

  openBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
    runSearch();
  });

  document
    .getElementById("confirmBtn")
    .addEventListener("click", confirmSelection);

  document
    .getElementById("cancelBtn")
    .addEventListener("click", closeSearch);

  [fLast, fFirst, fMiddle, fBirth, fCert].forEach(el =>
    el.addEventListener("input", runSearch)
  );

  async function runSearch() {
    let query = window.supabaseClient.from("childrens").select("*").limit(5);

    if (fLast.value) query = query.ilike("last_name", `%${fLast.value}%`);
    if (fFirst.value) query = query.ilike("first_name", `%${fFirst.value}%`);
    if (fMiddle.value) query = query.ilike("middle_name", `%${fMiddle.value}%`);
    if (fBirth.value) query = query.eq("birth_date", fBirth.value);
    if (fCert.value) query = query.ilike("birth_certificate", `%${fCert.value}%`);

    const { data, error } = await query;
    if (error) {
      console.error(error);
      return;
    }

    results.innerHTML = "";

    data.forEach(child => {
      const li = document.createElement("li");
      li.textContent = `${child.last_name} ${child.first_name} ${child.middle_name || ""} (${child.birth_date})`;

      li.addEventListener("click", () => {
        selectedChild = child;
        [...results.children].forEach(i => i.classList.remove("active"));
        li.classList.add("active");
      });

      results.appendChild(li);
    });
  }

  function confirmSelection() {
    if (!selectedChild) return;

    childIdInput.value = selectedChild.id;

    Object.keys(selectedChild).forEach(key => {
      const field = form.elements[key];
      if (!field) return;

      if (field.type === "checkbox") {
        field.checked = selectedChild[key];
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
});

/* ======================================================
   INSERT/UPDATE/ ДИТИНИ В БАЗУ
====================================================== */

const form = document.getElementById("childForm");

form.addEventListener("submit", async (e) => {
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

  const id = document.getElementById("childId").value;

  let result;

  if (id) {
    // ✏️ UPDATE
    result = await window.supabaseClient
      .from("childrens")
      .update(payload)
      .eq("id", id);
  } else {
    // ➕ INSERT
    result = await window.supabaseClient
      .from("childrens")
      .insert([payload]);
  }

  if (result.error) {
    console.error(result.error);
    alert("❌ Помилка збереження");
    return;
  }

  alert("✅ Дані успішно збережено");
  form.reset();
  document.getElementById("childId").value = "";
});

