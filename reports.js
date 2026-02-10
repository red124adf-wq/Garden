/* ======================================================
   REPORTS PAGE (COLLECT FILTERS ONLY)
====================================================== */

document.addEventListener("DOMContentLoaded", initReportsPage);

/* ================= INIT ================= */

async function initReportsPage() {
    // --- AUTH ---
    if (typeof window.requireAuth === "function") {
        const authorized = await window.requireAuth();
        if (!authorized) return;
    }

    const supabase = getSupabase();
    if (!supabase) {
        showError("Supabase не ініціалізовано");
        return;
    }

    initDatePickers();
    await initSchoolYears(supabase);
    initGroupSelect(supabase);
    initGenerateButton();
    initClearButton();
}

/* ================= HELPERS ================= */

function getSupabase() {
    return window.supabaseClient || window.supabase;
}

function showError(message) {
    console.error(message);
    alert(`❌ ${message}`);
}

/* ================= DATE PICKERS ================= */

function initDatePickers() {
    flatpickr("#birth_from", { dateFormat: "Y-m-d" });
    flatpickr("#birth_to", { dateFormat: "Y-m-d" });
}

/* ================= SCHOOL YEARS ================= */

async function initSchoolYears(supabase) {
    const select = document.getElementById("school_year");
    if (!select) return;

    resetSelect(select, "Навчальний рік");

    const { data, error } = await supabase
        .from("groups")
        .select("year_start, year_end")
        .order("year_start", { ascending: false });

    if (error) {
        showError("Не вдалося завантажити навчальні роки");
        return;
    }

    const years = [...new Set((data || []).map((row) => `${row.year_start}-${row.year_end}`))];

    years.forEach((year) => {
        select.appendChild(createOption(year, year.replace("-", "–")));
    });
}

/* ================= GROUP SELECT ================= */

function initGroupSelect(supabase) {
    const schoolYearSelect = document.getElementById("school_year");
    const groupSelect = document.getElementById("group");

    if (!schoolYearSelect || !groupSelect) return;

    resetSelect(groupSelect, "Група");
    groupSelect.disabled = true;

    schoolYearSelect.addEventListener("change", async () => {
        const year = schoolYearSelect.value;
        resetSelect(groupSelect, "Група");
        groupSelect.disabled = true;

        if (!year) return;
        await loadGroupsByYear(supabase, year, groupSelect);
    });
}

/* ================= GENERATE REPORT ================= */

function initGenerateButton() {
    const btn = document.getElementById("generate");
    if (!btn) return;

    btn.addEventListener("click", generateReport);
}

function generateReport() {
    const params = new URLSearchParams();

    collectInput("gender", (value) => params.set("gender", value));
    collectInput("birth_from", (value) => params.set("birth_from", value));
    collectInput("birth_to", (value) => params.set("birth_to", value));
    collectInput("school_year", (value) => params.set("school_year", value));
    collectInput("group", (value) => params.set("group_id", value));
    collectInput("city", (value) => params.set("city", value.trim()));

    collectRadio("leave", (value) => {
        if (value !== "all") params.set("leave", value);
    });

    collectRadio("territory", (value) => params.set("territory", value));

    document
        .querySelectorAll('.card input[type="checkbox"]:checked')
        .forEach((checkbox) => params.append("flags", checkbox.value));

    window.open(`report-view.html?${params.toString()}`, "_blank");
}

/* ================= GROUPS BY YEAR ================= */

async function loadGroupsByYear(supabase, schoolYear, select) {
    const [startYear, endYear] = schoolYear.split("-").map(Number);
    if (!startYear || !endYear) return;

    const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .eq("year_start", startYear)
        .eq("year_end", endYear)
        .order("name");

    if (error) {
        showError("Не вдалося завантажити групи");
        return;
    }

    (data || []).forEach((group) => {
        select.appendChild(createOption(group.id, group.name));
    });

    select.disabled = false;
}

/* ================= HELPERS ================= */

function resetSelect(select, placeholder) {
    select.innerHTML = "";
    select.appendChild(createOption("", placeholder));
}

function createOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
}

function collectInput(id, handler) {
    const el = document.getElementById(id);
    if (el && el.value) {
        handler(el.value);
    }
}

function collectRadio(name, handler) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    if (el && el.value) {
        handler(el.value);
    }
}

function initClearButton() {
    const clearBtn = document.getElementById("clear");
    if (!clearBtn) return;

    clearBtn.addEventListener("click", () => {
        window.location.reload();
    });
}
