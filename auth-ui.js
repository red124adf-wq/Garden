/* ======================================================
   AUTH UI (LOGIN / LOGOUT)
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const authBlock = document.getElementById("authBlock");
  const appBlock = document.getElementById("app");

  async function updateAuthUI() {
    const { data } = await window.supabaseClient.auth.getUser();

    if (data?.user) {
      authBlock?.classList.add("hidden");
      appBlock?.classList.remove("hidden");
    } else {
      authBlock?.classList.remove("hidden");
      appBlock?.classList.add("hidden");
    }
  }

  // первинна перевірка
  updateAuthUI();

  // реагує на логін / логаут
  window.supabaseClient.auth.onAuthStateChange(() => {
    updateAuthUI();
  });

  // логін
  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      alert("Введіть email та пароль");
      return;
    }

    const { error } =
      await window.supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      alert("Помилка входу");
    }
  });

  // логаут
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await window.supabaseClient.auth.signOut();
  });
});
