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

  async function handleLogin() {
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();

    if (!email || !password) {
      alert("Введіть email та пароль");
      return;
    }

    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert("Помилка входу. Перевірте email і пароль.");
    }
  }

  // первинна перевірка
  updateAuthUI();

  // реагує на логін / логаут
  window.supabaseClient.auth.onAuthStateChange(() => {
    updateAuthUI();
  });

  // логін по кнопці
  document.getElementById("loginBtn")?.addEventListener("click", handleLogin);

  // логін по Enter в полі паролю
  document.getElementById("password")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLogin();
    }
  });

  // логаут (працює і для динамічно підвантаженого sidebar)
  document.addEventListener("click", async (event) => {
    const logoutButton = event.target.closest("#logoutBtn");
    if (!logoutButton) return;

    event.preventDefault();
    await window.supabaseClient.auth.signOut();
    window.location.href = "index.html";
  });
});
