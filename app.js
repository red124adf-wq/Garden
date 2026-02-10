/* ======================================================
   DOM
====================================================== */
const yearText      = document.getElementById("totalPromigok");
const totalChildren = document.getElementById("totalChildren");
const totalGirls    = document.getElementById("totalGirls");
const totalBoys     = document.getElementById("totalBoys");
const totalGroups = document.getElementById("totalGroups");

const prevBtn = document.getElementById("prevYear");
const nextBtn = document.getElementById("nextYear");

/* ======================================================
   SUPABASE
   ❗ НЕ СТВОРЮЄМО ЗАНОВО
   ❗ ВИКОРИСТОВУЄМО ІСНУЮЧИЙ
====================================================== */
const supabaseClient =
    window.supabaseClient || window.supabase;

/* ======================================================
   STATE
====================================================== */
let years = [];
let currentIndex = 0;

/* ======================================================
   LOAD YEARS
====================================================== */
async function loadYears() {
    const { data, error } = await supabaseClient
        .from("report_children_by_year")
        .select("study_start_date, study_end_date")
        .order("study_start_date", { ascending: true });

    if (error) {
        console.error("Помилка завантаження років:", error);
        return;
    }

    years = data;

    const today = new Date();

    // знайти реальний поточний навчальний рік
    let foundIndex = years.findIndex(y => {
        const start = new Date(y.study_start_date);
        const end   = new Date(y.study_end_date);
        return today >= start && today <= end;
    });

    // якщо сьогодні між роками (літо) — беремо попередній
    if (foundIndex === -1) {
        foundIndex = years.findIndex(y => {
            const end = new Date(y.study_end_date);
            return end < today;
        });
    }

    // fallback — останній
    currentIndex = foundIndex !== -1
        ? foundIndex
        : years.length - 1;

    loadYearData();
}

/* ======================================================
   LOAD YEAR DATA
====================================================== */
async function loadYearData() {
    const year = years[currentIndex];

    const { data, error } = await supabaseClient
        .from("report_children_by_year")
        .select("*")
        .eq("study_start_date", year.study_start_date)
        .single();

    if (error) {
        console.error("Помилка завантаження року:", error);
        return;
    }

    const from = new Date(data.study_start_date).getFullYear();
    const to   = new Date(data.study_end_date).getFullYear();

    yearText.textContent      = `${from}–${to}`;
    totalChildren.textContent = data.total_children;
    totalGirls.textContent    = data.girls;
    totalBoys.textContent     = data.boys;

	loadGroupsForYear(
		data.study_start_date,
		data.study_end_date
	);

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === years.length - 1;
}

/* ======================================================
   YEAR CONTROLS
====================================================== */
prevBtn.onclick = () => {
    if (currentIndex > 0) {
        currentIndex--;
        loadYearData();
    }
};

nextBtn.onclick = () => {
    if (currentIndex < years.length - 1) {
        currentIndex++;
        loadYearData();
    }
};

/* ======================================================
   MENU (як було)
====================================================== */
document.querySelectorAll(".menu-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".menu-btn")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    };
});

/* ======================================================
   SEASON (НЕ ЧІПАЄМО)
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
   START
====================================================== */
document.addEventListener("DOMContentLoaded", loadYears);

/* ======================================================
   LOAD GROUPS
====================================================== */
async function loadGroupsForYear(studyStartDate, studyEndDate) {
    const { data, error } = await supabaseClient
        .from("groups")
        .select("id")
        .eq("study_start_date", studyStartDate)
        .eq("study_end_date", studyEndDate);

    if (error) {
        console.error("Помилка завантаження груп:", error);
        totalGroups.textContent = "—";
        return;
    }

    totalGroups.textContent = data.length;
}
