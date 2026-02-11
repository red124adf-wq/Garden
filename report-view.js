/* ======================================================
   REPORT VIEW + PDF EXPORT (STABLE VERSION)
====================================================== */

document.addEventListener("DOMContentLoaded", initReportView);

let reportRows = [];
let currentParams = null;

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

    currentParams = new URLSearchParams(window.location.search);

    try {
        reportRows = await fetchReportData(supabase, currentParams);
        renderTable(reportRows);
        setupPDFExport();
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

    params.getAll("flags").forEach(flag => {
        const column = flagMap[flag];
        if (column) query.eq(column, true);
    });
}

/* ================= TABLE (ЕКРАННА ВЕРСІЯ - НЕ ЧІПАЄМО) ================= */

function renderTable(rows) {

    const tbody = document.querySelector("#reportTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="6">Дані не знайдено</td></tr>`;
        return;
    }

    rows.forEach((row, index) => {

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${formatFullName(row)}</td>
            <td>${formatDateUA(row.birth_date)}</td>
            <td>${formatAddress(row)}</td>
            <td>${row.parents_full_name ?? ""}</td>
            <td>${row.phone ?? ""}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* ================= PDF EXPORT ================= */

function setupPDFExport() {

    const btn = document.getElementById("pdfBtn");
    if (!btn) return;

    btn.addEventListener("click", generatePDF);
}

function generatePDF() {

    const container = document.getElementById("pdf-template");

    container.innerHTML = buildPdfLayout();
    container.style.display = "block";

    const options = {
        margin: 0,                        // ВАЖЛИВО — поля тільки через CSS
        filename: `Звіт-${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: "jpeg", quality: 1 },
        html2canvas: { 
            scale: 2,
            useCORS: true
        },
        pagebreak: { mode: ["css"] },
        jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        }
    };

    html2pdf()
        .set(options)
        .from(container)
        .save()
        .then(() => {
            container.style.display = "none";
        });
}

/* ================= PDF LAYOUT ================= */

function buildPdfLayout() {

    const today = formatDateUA(new Date().toISOString());
    const subtitle = buildPdfSubtitle(currentParams);

    const rowsHtml = reportRows.map((row, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${formatFullName(row)}</td>
            <td>${formatDateUA(row.birth_date)}</td>
            <td>${row.group_name ?? ""}</td>
            <td>${buildPdfNote(row)}</td>
        </tr>
    `).join("");

    return `
        <div class="pdf-inner">

            <div class="pdf-page">

                <div class="pdf-title-top">
                    Дар’ївський заклад дошкільної освіти Дар’ївської сільської ради<br>
                    Херсонського району Херсонської області
                </div>

                <div class="pdf-main-title">
                    ЗВІТ
                </div>

                <div class="pdf-subtitle">
                    ${subtitle} станом на ${today} року
                </div>

                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th>№ з/п</th>
                            <th>ПІБ дитини</th>
                            <th>Дата народження</th>
                            <th>Група</th>
                            <th>Примітка</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="pdf-footer">
                    <div>Директор ________________________</div>
                    <div>Оксана ПЕТРОВА</div>
                </div>

            </div>

        </div>
    `;
}


/* ================= SUBTITLE ================= */

function buildPdfSubtitle(params) {

    const gender = params.get("gender");
    const schoolYear = params.get("school_year");

    let text = "про дітей";

    if (gender === "female") text = "про дівчаток";
    if (gender === "male") text = "про хлопчиків";

    if (schoolYear) {
        text += ` ${schoolYear} навчального року`;
    } else {
        text += " дошкільного віку";
    }

    return text;
}

/* ================= PDF NOTE ================= */

function buildPdfNote(row) {

    const notes = [];

    if (row.low_income) notes.push("Малозабезпечена сім’я");
    if (row.idp) notes.push("ВПО");
    if (row.parents_military) notes.push("батьки військовослужбовці");

    return notes.join(", ");
}

/* ================= HELPERS ================= */

function formatFullName(row) {
    return [row.last_name, row.first_name, row.middle_name]
        .filter(Boolean)
        .join(" ");
}

function formatAddress(row) {
    return [row.settlement, row.street, row.house, row.apartment]
        .filter(Boolean)
        .join(", ");
}

function formatDateUA(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date)) return "";
    return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}
