/* ======================================================
   SUPABASE / AUTH (ДОДАНО)
====================================================== */
const SUPABASE_URL = "https://wesibzuxkytajteyejmw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indlc2lienV4a3l0YWp0ZXllam13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMDUwNzIsImV4cCI6MjA4NTc4MTA3Mn0.eRymrXGUaA0HXAFEuyZwjbSJLEOnNZuG0O2ux_cyP6U"; // ← встав СВІЙ ключ

// ініціалізація (глобально, без втручання в іншу логіку)
window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

const authBlock = document.getElementById("authBlock");
const appBlock = document.getElementById("app");

async function checkAuth() {
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
checkAuth();

// реагує на логін / логаут
window.supabaseClient.auth.onAuthStateChange(() => {
    checkAuth();
});

// логін
document.getElementById("loginBtn")?.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

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

/* ======================================================
   ДАНІ
====================================================== */
const stats = {
	girls: 20,
    boys: 22,
    groups: 4,
    teachers: 8
};

document.getElementById("totalGirls").textContent = stats.girls;
document.getElementById("totalBoys").textContent = stats.boys;
document.getElementById("totalChildren").textContent = stats.girls + stats.boys;
document.getElementById("totalGroups").textContent = stats.groups;
document.getElementById("totalTeachers").textContent = stats.teachers;


/* ======================================================
   НАВЧАЛЬНИЙ РІК
====================================================== */
function getCurrentSchoolYear(date = new Date()) {
    const y = date.getFullYear();
    return date.getMonth() >= 8
        ? { from: y, to: y + 1 }
        : { from: y - 1, to: y };
}

const currentYear = getCurrentSchoolYear();
let shownYear = { ...currentYear };

const yearText = document.getElementById("totalPromigok");
const prevBtn = document.getElementById("prevYear");
const nextBtn = document.getElementById("nextYear");

function renderYear() {
    yearText.textContent = `${shownYear.from}–${shownYear.to}`;
    nextBtn.disabled =
        shownYear.from === currentYear.from &&
        shownYear.to === currentYear.to;
}

prevBtn.onclick = () => {
    shownYear.from--;
    shownYear.to--;
    renderYear();
};

nextBtn.onclick = () => {
    if (nextBtn.disabled) return;
    shownYear.from++;
    shownYear.to++;
    renderYear();
};

renderYear();

/* ======================================================
   МЕНЮ
====================================================== */
document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".menu-btn")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    };
});

/* ======================================================
   СЕЗОНИ
====================================================== */
(function setSeason() {
    const m = new Date().getMonth();
    let season = "summer";

    if (m >= 2 && m <= 4) season = "spring";
    else if (m >= 5 && m <= 7) season = "summer";
    else if (m >= 8 && m <= 10) season = "autumn";
    else season = "winter";

    document.body.className = `season-${season}`;
})();

/* ======================================================
   СЕЗОННІ ЧАСТИНКИ
====================================================== */
const sidebar = document.querySelector(".sidebar");

setInterval(() => {
    const p = document.createElement("div");
    p.className = "season-particle";
    p.textContent = getComputedStyle(document.body)
        .getPropertyValue("--particle")
        .replace(/"/g, "");

    p.style.left = Math.random() * (sidebar.clientWidth - 20) + "px";
    p.style.fontSize = 14 + Math.random() * 12 + "px";
    p.style.animationDuration = 6 + Math.random() * 6 + "s";

    sidebar.appendChild(p);
    setTimeout(() => p.remove(), 12000);
}, 2200);

/* ======================================================
   ПЕРЕХІД НА СТОРІНКУ ДІТЕЙ
====================================================== */
document.querySelectorAll(".menu-btn").forEach(btn => {
    if (btn.textContent.includes("Діти")) {
        btn.addEventListener("click", () => {
            window.location.href = "childrens.html";
        });
    }
});
