const authBlock = document.getElementById("authBlock");
const appBlock = document.getElementById("app");

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
    return date.getMonth() >= 8 ?
        {
            from: y,
            to: y + 1
        } :
        {
            from: y - 1,
            to: y
        };
}

const currentYear = getCurrentSchoolYear();
let shownYear = {
    ...currentYear
};

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
