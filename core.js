/* ======================================================
   SUPABASE CORE (GLOBAL)
====================================================== */

const SUPABASE_URL = "https://wesibzuxkytajteyejmw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U";

// ⛔ ініціалізуємо Supabase ОДИН РАЗ
if (!window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

/* ======================================================
   AUTH GUARD (ДЛЯ ЗАХИЩЕНИХ СТОРІНОК)
====================================================== */

window.requireAuth = async function requireAuth() {
  const { data, error } = await window.supabaseClient.auth.getUser();

  if (error || !data?.user) {
    window.location.href = "index.html";
    return false;
  }

  window.currentUser = data.user;
  return true;
};
