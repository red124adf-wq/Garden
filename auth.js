// js/auth.js — спільна логіка авторизації

const SUPABASE_URL = 'https://wesibzuxkytajteyejmw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Перевірка сесії — якщо не залогінений, повертаємо на логін
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

// Вихід
async function logout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}
