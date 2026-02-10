/* ======================================================
   DOM
====================================================== */
const yearText = document.getElementById("totalPromigok");
const totalChildren = document.getElementById("totalChildren");
const totalGirls = document.getElementById("totalGirls");
const totalBoys = document.getElementById("totalBoys");
const totalGroups = document.getElementById("totalGroups");
const totalTeachers = document.getElementById("totalTeachers");
const statusEl = document.getElementById("dashboardStatus");

const prevBtn = document.getElementById("prevYear");
const nextBtn = document.getElementById("nextYear");

/* ======================================================
   SUPABASE
====================================================== */
const supabaseClient = window.supabaseClient || window.supabase;

/* ======================================================
   STATE
====================================================== */
let years = [];
let currentIndex = 0;

/* ======================================================
   UI HELPERS
====================================================== */
function setStatus(message = "", isError = false) {
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.classList.toggle("hidden", !message);
  statusEl.classList.toggle("error", isError);
}

function setDefaultDashboardState() {
  yearText.textContent = "—";
  totalChildren.textContent = "0";
  totalGirls.textContent = "0";
  totalBoys.textContent = "0";
  totalGroups.textContent = "0";
  totalTeachers.textContent = "—";

  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

/* ======================================================
   LOAD YEARS
====================================================== */
async function loadYears() {
  if (!supabaseClient) {
    setStatus("Помилка ініціалізації Supabase", true);
    setDefaultDashboardState();
    return;
  }

  setStatus("Завантаження даних...");

  const { data, error } = await supabaseClient
    .from("report_children_by_year")
    .select("study_start_date, study_end_date")
    .order("study_start_date", { ascending: true });

  if (error) {
    console.error("Помилка завантаження років:", error);
    setStatus("Не вдалося завантажити навчальні роки", true);
    setDefaultDashboardState();
    return;
  }

  years = data || [];

  if (years.length === 0) {
    setStatus("Немає даних для відображення");
    setDefaultDashboardState();
    return;
  }

  const today = new Date();

  let foundIndex = years.findIndex((year) => {
    const start = new Date(year.study_start_date);
    const end = new Date(year.study_end_date);
    return today >= start && today <= end;
  });

  if (foundIndex === -1) {
    for (let i = years.length - 1; i >= 0; i -= 1) {
      const end = new Date(years[i].study_end_date);
      if (end < today) {
        foundIndex = i;
        break;
      }
    }
  }

  currentIndex = foundIndex !== -1 ? foundIndex : years.length - 1;

  await loadYearData();
}

/* ======================================================
   LOAD YEAR DATA
====================================================== */
async function loadYearData() {
  const year = years[currentIndex];

  if (!year) {
    setStatus("Не знайдено дані по вибраному року", true);
    setDefaultDashboardState();
    return;
  }

  const { data, error } = await supabaseClient
    .from("report_children_by_year")
    .select("*")
    .eq("study_start_date", year.study_start_date)
    .single();

  if (error) {
    console.error("Помилка завантаження року:", error);
    setStatus("Не вдалося завантажити підсумки року", true);
    return;
  }

  const from = new Date(data.study_start_date).getFullYear();
  const to = new Date(data.study_end_date).getFullYear();

  yearText.textContent = `${from}–${to}`;
  totalChildren.textContent = data.total_children ?? "0";
  totalGirls.textContent = data.girls ?? "0";
  totalBoys.textContent = data.boys ?? "0";
  totalTeachers.textContent = data.total_teachers ?? "—";

  await loadGroupsForYear(data.study_start_date, data.study_end_date);

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === years.length - 1;

  setStatus("");
}

/* ======================================================
   YEAR CONTROLS
====================================================== */
prevBtn.onclick = async () => {
  if (currentIndex > 0) {
    currentIndex--;
    await loadYearData();
  }
};

nextBtn.onclick = async () => {
  if (currentIndex < years.length - 1) {
    currentIndex++;
    await loadYearData();
  }
};

/* ======================================================
   MENU
====================================================== */
document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll(".menu-btn")
      .forEach((menuBtn) => menuBtn.classList.remove("active"));
    btn.classList.add("active");
  };
});

/* ======================================================
   SEASON
====================================================== */
(function setSeason() {
  const month = new Date().getMonth();
  let season = "summer";

  if (month >= 2 && month <= 4) season = "spring";
  else if (month >= 5 && month <= 7) season = "summer";
  else if (month >= 8 && month <= 10) season = "autumn";
  else season = "winter";

  document.body.classList.remove(
    "season-spring",
    "season-summer",
    "season-autumn",
    "season-winter"
  );
  document.body.classList.add(`season-${season}`);
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
