/* ======================================================
   REPORT VIEW (QUERY + TABLE)
====================================================== */

document.addEventListener("DOMContentLoaded", initReportView);

let reportRows = [];
let selectedDirectoryHandle = null;

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
        reportRows = data;
        renderTable(data);
        setupWordExport();
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


/* ================= WORD EXPORT ================= */

function setupWordExport() {
    const wordBtn = document.getElementById("wordExportBtn");
    const modal = document.getElementById("wordExportModal");
    const docNameInput = document.getElementById("docNameInput");
    const saveLocationInput = document.getElementById("saveLocationInput");
    const chooseLocationBtn = document.getElementById("chooseLocationBtn");
    const cancelBtn = document.getElementById("cancelExportBtn");
    const confirmBtn = document.getElementById("confirmExportBtn");

    if (!wordBtn || !modal || !docNameInput || !saveLocationInput || !chooseLocationBtn || !cancelBtn || !confirmBtn) return;

    docNameInput.value = `zvit-ditei-${getTodayForFileName()}`;

    wordBtn.addEventListener("click", () => openWordModal(modal, docNameInput));
    cancelBtn.addEventListener("click", () => closeWordModal(modal));

    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeWordModal(modal);
    });

    chooseLocationBtn.addEventListener("click", async () => {
        const picker = window.showDirectoryPicker;
        if (typeof picker !== "function") {
            alert("Вибір папки недоступний у цьому браузері. Буде використано стандартне збереження браузера.");
            return;
        }

        try {
            selectedDirectoryHandle = await picker();
            saveLocationInput.value = selectedDirectoryHandle?.name ?? "Обрану папку";
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.error(error);
                alert("Не вдалося обрати папку");
            }
        }
    });

    confirmBtn.addEventListener("click", async () => {
        const fileName = normalizeFileName(docNameInput.value);

        try {
            await exportWordReport(fileName, reportRows, selectedDirectoryHandle);
            closeWordModal(modal);
        } catch (error) {
            console.error(error);
            alert("Помилка під час експорту у Word");
        }
    });
}

function openWordModal(modal, docNameInput) {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    docNameInput.focus();
    docNameInput.select();
}

function closeWordModal(modal) {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
}

async function exportWordReport(fileName, rows, directoryHandle) {
    const html = buildWordHtml(rows);

    if (directoryHandle && typeof directoryHandle.getFileHandle === "function") {
        const fileHandle = await directoryHandle.getFileHandle(`${fileName}.doc`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(html);
        await writable.close();
        return;
    }

    if (typeof window.showSaveFilePicker === "function") {
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${fileName}.doc`,
            types: [{
                description: "Word document",
                accept: { "application/msword": [".doc"] }
            }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(html);
        await writable.close();
        return;
    }

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${fileName}.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

function buildWordHtml(rows) {
    const today = formatDateUA(new Date().toISOString());
    const rowsToExport = rows.length
        ? rows
        : Array.from({ length: 5 }, () => ({}));

    const reportRowsHtml = rowsToExport.map((row, index) => {
        const fullName = formatFullName(row);
        const birthDate = formatDateUA(row.birth_date);

        return `
<tr>
<td class="ncol">${index + 1}</td>
<td>${fullName || "&nbsp;"}</td>
<td>${birthDate || "&nbsp;"}</td>
<td>${row.category ?? "&nbsp;"}</td>
<td>${row.notes ?? "&nbsp;"}</td>
</tr>`;
    }).join("");

    return `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="utf-8">
<style>
    body { font-family: 'Times New Roman', serif; color: #173f7d; margin: 28px 40px; }
    .title { text-align: center; font-size: 18pt; font-weight: 700; line-height: 1.25; }
    .subtitle { text-align: center; margin-top: 28px; font-size: 17pt; font-weight: 700; }
    .subtitle2 { text-align: center; margin-top: 4px; font-size: 16pt; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 42px; color: #000; font-size: 14pt; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; line-height: 1.15; }
    th { text-align: left; font-weight: 700; }
    .ncol { width: 46px; text-align: center; }
    .name-col { width: 34%; }
    .date-col { width: 20%; }
    .cat-col { width: 21%; }
    .note-col { width: 21%; }
    .footer { margin-top: 72px; color: #000; font-size: 14pt; display: flex; justify-content: space-between; gap: 20px; }
</style>
</head>
<body>
    <div class="title">Дарʼївський заклад дошкільної освіти Дарʼївської сільської ради Херсонського району Херсонської області</div>
    <div class="subtitle">ЗВІТ</div>
    <div class="subtitle2">про дітей xxx категорії станом на ${today}</div>

    <table>
        <tr>
            <th class="ncol">№</th>
            <th class="name-col">ПІБ дитини</th>
            <th class="date-col">Дата народження</th>
            <th class="cat-col">Категорія</th>
            <th class="note-col">Примітки</th>
        </tr>
        ${reportRowsHtml}
    </table>

    <div class="footer">
        <span>Директор _______________________</span>
        <span>Оксана ЗЕЛІНСЬКА</span>
    </div>
</body>
</html>`;
}

function getTodayForFileName() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();

    return `${yyyy}-${mm}-${dd}`;
}

function normalizeFileName(name) {
    const normalized = String(name || "").trim().replace(/[\\/:*?"<>|]+/g, "-");
    return normalized || `zvit-ditei-${getTodayForFileName()}`;
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
