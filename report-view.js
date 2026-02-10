/* ======================================================
   REPORT VIEW (QUERY + TABLE)
====================================================== */

document.addEventListener("DOMContentLoaded", initReportView);

/* ================= INIT ================= */

async function initReportView() {
    if (typeof window.requireAuth === "function") {
        const authorized = await window.requireAuth();
        if (!authorized) return;
    }

    const supabase = window.supabaseClient || window.supabase;
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

    if (gender) query.eq("gender", gender);
    if (birthFrom) query.gte("birth_date", birthFrom);
    if (birthTo) query.lte("birth_date", birthTo);
    if (groupId) query.eq("group_id", groupId);

    if (schoolYear) {
        const [start, end] = schoolYear.split("-").map(Number);
        query.gte("year_start", start).lte("year_end", end);
    }

    if (city) query.ilike("settlement", `%${city}%`);
}

function applyLeaveStatus(query, params) {
    const leave = params.get("leave");

    if (leave === "active") query.is("withdrawn", null);
    if (leave === "left") query.not("withdrawn", "is", null);
}

function applyTerritory(query, params) {
    const territory = params.get("territory");
    if (territory) query.eq("location_status", territory);
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

    params.getAll("flags").forEach((flag) => {
        const column = flagMap[flag];
        if (column) query.eq(column, true);
    });
}

/* ================= TABLE ================= */

function renderTable(rows) {
    const tbody = document.querySelector("#reportTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6">Дані не знайдено</td>`;
        tbody.appendChild(tr);
        return;
    }

    const sortedRows = [...rows].sort((a, b) => {
        const dateA = parseDate(a.birth_date);
        const dateB = parseDate(b.birth_date);
        return dateB - dateA;
    });

    sortedRows.forEach((row, index) => {
        tbody.appendChild(createRow(row, index + 1));
    });
}

function createRow(row, index) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
        <td>${index}</td>
        <td>${formatFullName(row)}</td>
        <td>${formatDateUA(row.birth_date)}</td>
        <td>${formatAddress(row)}</td>
        <td>${row.parents_full_name ?? ""}</td>
        <td>${row.phone ?? ""}</td>
    `;

    return tr;
}

/* ================= HELPERS ================= */

function formatFullName(row) {
    return [row.last_name, row.first_name, row.middle_name]
        .filter(Boolean)
        .join(" ");
}

function formatAddress(row) {
    return [row.settlement, row.street, row.house, row.apartment]
        .filter((part) => part && String(part).trim())
        .join(", ");
}


function parseDate(value) {
    if (!value) return new Date(0);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function formatDateUA(value) {
    if (!value) return "";
    const date = parseDate(value);
    if (date.getTime() === 0) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}.${month}.${year}`;
}
