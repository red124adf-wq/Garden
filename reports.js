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

    const supabase = window.supabaseClient;
    if (!supabase) {
        alert("Supabase не ініціалізовано");
        return;
    }

    initDatePickers();
    await initSchoolYears(supabase);
    initGroupSelect(supabase);
    initGenerateButton();
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
        console.error("Error loading school years:", error);
        return;
    }

    const years = [...new Set(
        data.map(r => `${r.year_start}-${r.year_end}`)
    )];

    years.forEach(year => {
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

    collectInput("gender", v => params.set("gender", v));
    collectInput("birth_from", v => params.set("birth_from", v));
    collectInput("birth_to", v => params.set("birth_to", v));
    collectInput("school_year", v => params.set("school_year", v));
    collectInput("group", v => params.set("group_id", v));
    collectInput("city", v => params.set("city", v.trim()));

    collectRadio("leave", v => {
        if (v !== "all") params.set("leave", v);
    });

    collectRadio("territory", v => params.set("territory", v));

    document
        .querySelectorAll('.card input[type="checkbox"]:checked')
        .forEach(cb => params.append("flags", cb.value));

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
        console.error("Error loading groups:", error);
        return;
    }

    data.forEach(group => {
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
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    return opt;
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

// ================= CLEAR BUTTON =================

const clearBtn = document.getElementById("clear");

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        window.location.reload();
    });
}
