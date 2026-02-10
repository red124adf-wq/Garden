/* ======================================================
   REPORT VIEW (QUERY + TABLE)
====================================================== */

document.addEventListener("DOMContentLoaded", initReportView);

/* ================= INIT ================= */

async function initReportView() {
    // --- AUTH ---
    if (typeof window.requireAuth === "function") {
        const authorized = await window.requireAuth();
        if (!authorized) return;
    }

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("Supabase client not found");
        return;
    }

    const params = new URLSearchParams(window.location.search);

    try {
        const data = await fetchReportData(supabase, params);
        renderTable(data);
    } catch (err) {
        console.error(err);
        alert("Помилка завантаження звіту");
    }
}

/* ================= DATA ================= */

async function fetchReportData(supabase, params) {
    let query = supabase
        .from("report_children_full")
        .select("*");

    applyBasicFilters(query, params);
    applyLeaveStatus(query, params);
    applyTerritory(query, params);
    applyFlags(query, params);

    const { data, error } = await query;

    if (error) throw error;
    return data ?? [];
}

/* ================= FILTERS ================= */

function applyBasicFilters(query, params) {
    const gender = params.get("gender");
    const birthFrom = params.get("birth_from");
    const birthTo = params.get("birth_to");
    const groupId = params.get("group_id");
    const schoolYear = params.get("school_year");
    const city = params.get("city");

    if (gender) {
        query.eq("gender", gender);
    }

    if (birthFrom) {
        query.gte("birth_date", birthFrom);
    }

    if (birthTo) {
        query.lte("birth_date", birthTo);
    }

    if (groupId) {
        query.eq("group_id", groupId);
    }

    if (schoolYear) {
        const [start, end] = schoolYear.split("-").map(Number);
        query
            .gte("year_start", start)
            .lte("year_end", end);
    }

    if (city) {
        query.ilike("settlement", `%${city}%`);
    }
}

function applyLeaveStatus(query, params) {
    const leave = params.get("leave");

    if (leave === "active") {
        query.is("withdrawn", null);
    }

    if (leave === "left") {
        query.not("withdrawn", "is", null);
    }
}

function applyTerritory(query, params) {
    const territory = params.get("territory");
    if (territory) {
        query.eq("location_status", territory);
    }
}

function applyFlags(query, params) {
    const flagMap = {
        orphan: "orphan",
        inclusive: "inclusion",
        many: "many_children_family",
        poor: "low_income",
        no_care: "deprived_parental_care",
        chernobyl: "chornobyl",

        ato: "ato",
        vpo: "idp",
        war_child: "war_child",
        military: "parents_military",
        ubd: "parents_ubd",
        missing: "missing_father"
    };

    const flags = params.getAll("flags");

    flags.forEach(flag => {
        const column = flagMap[flag];
        if (column) {
            query.eq(column, true);
        }
    });
}

/* ================= TABLE ================= */

function renderTable(rows) {
    const tbody = document.querySelector("#reportTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    rows.forEach(row => {
        tbody.appendChild(createRow(row));
    });
}

function createRow(r) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${formatFullName(r)}</td>
        <td>${r.gender ?? ""}</td>
        <td>${r.birth_date ?? ""}</td>
        <td>${r.group_name ?? ""}</td>
        <td>${r.settlement ?? ""}</td>
        <td>${r.withdrawn ? "Вибув" : "Наявний"}</td>
    `;

    return tr;
}

/* ================= HELPERS ================= */

function formatFullName(r) {
    return [
        r.last_name,
        r.first_name,
        r.middle_name
    ].filter(Boolean).join(" ");
}
