/* ======================================================
   APP
====================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    if (!(await requireAuth())) return;

    /* ======================================================
       DOM
    ====================================================== */

    const form = document.getElementById("childForm");
    const childIdInput = document.getElementById("childId");

    const modal = document.getElementById("searchModal");
    const openSearchBtn = document.getElementById("openSearchBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const resultsList = document.getElementById("searchResults");

    const prevBtn = document.getElementById("prevChildBtn");
    const nextBtn = document.getElementById("nextChildBtn");
    const counterEl = document.getElementById("childCounter");
    const unsavedIndicator = document.getElementById("unsavedIndicator");

    const filters = {
        last: document.getElementById("f_last_name"),
        first: document.getElementById("f_first_name"),
        middle: document.getElementById("f_middle_name"),
        birth: document.getElementById("f_birth_date"),
        cert: document.getElementById("f_certificate"),
    };

    /* ======================================================
       STATE
    ====================================================== */

    let selectedChild = null;
    let childrenIds = [];
    let childrenNames = [];
    let currentIndex = -1;
    let isDirty = false;

    /* ======================================================
       UNSAVED TRACKING
    ====================================================== */

    form.addEventListener("input", () => {
        isDirty = true;
        unsavedIndicator.classList.remove("hidden");
    });

    function confirmUnsavedChanges() {
        if (!isDirty) return true;
        return confirm("Є незбережені зміни. Продовжити без збереження?");
    }

    window.addEventListener("beforeunload", e => {
        if (!isDirty) return;
        e.preventDefault();
        e.returnValue = "";
    });

    /* ======================================================
       LOAD CHILDREN LIST
    ====================================================== */

    async function loadChildrenList() {
        const {
            data,
            error
        } = await window.supabaseClient
            .from("childrens")
            .select("id, last_name, first_name, middle_name")
            .order("last_name", {
                ascending: true
            });

        if (error) {
            console.error(error);
            return;
        }

        childrenIds = [];
        childrenNames = [];

        data.forEach(c => {
            childrenIds.push(c.id);
            childrenNames.push(
                `${c.last_name} ${c.first_name} ${c.middle_name || ""}`.trim()
            );
        });

        updateNavigationUI();
    }

    await loadChildrenList();

    /* ======================================================
       SEARCH
    ====================================================== */

    openSearchBtn.addEventListener("click", () => {
        if (!confirmUnsavedChanges()) return;
        modal.classList.remove("hidden");
        runSearch();
    });

    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        selectedChild = null;
        resultsList.innerHTML = "";
    });

    confirmBtn.addEventListener("click", () => {
        if (!confirmUnsavedChanges()) return;
        if (!selectedChild) return;

        currentIndex = childrenIds.indexOf(selectedChild.id);
        fillForm(selectedChild);

        modal.classList.add("hidden");
        resultsList.innerHTML = "";
        updateNavigationUI();
    });

    Object.values(filters).forEach(input =>
        input.addEventListener("input", runSearch)
    );

    async function runSearch() {
        let query = window.supabaseClient
            .from("childrens")
            .select("*")
            .order("last_name")
            .limit(5);

        if (filters.last.value)
            query = query.ilike("last_name", `%${filters.last.value}%`);
        if (filters.first.value)
            query = query.ilike("first_name", `%${filters.first.value}%`);
        if (filters.middle.value)
            query = query.ilike("middle_name", `%${filters.middle.value}%`);
        if (filters.birth.value)
            query = query.eq("birth_date", filters.birth.value);
        if (filters.cert.value)
            query = query.ilike("birth_certificate", `%${filters.cert.value}%`);

        const {
            data
        } = await query;

        resultsList.innerHTML = "";
        selectedChild = null;

        data.forEach(child => {
            const li = document.createElement("li");
            li.textContent = `${child.last_name} ${child.first_name} (${child.birth_date})`;

            li.addEventListener("click", () => {
                selectedChild = child;
                [...resultsList.children].forEach(x => x.classList.remove("active"));
                li.classList.add("active");
            });

            resultsList.appendChild(li);
        });
    }

    /* ======================================================
       LOAD & FILL FORM
    ====================================================== */

    async function loadChildById(id) {
        const {
            data,
            error
        } = await window.supabaseClient
            .from("childrens")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error(error);
            return;
        }

        fillForm(data);
        updateNavigationUI();
    }

    function fillForm(data) {
        childIdInput.value = data.id;
        // ⛔ Скидаємо всі radio-кнопки (важливо для NULL)
        form.querySelectorAll("input[type='radio']").forEach(radio => {
            radio.checked = false;
        });
        Object.keys(data).forEach(key => {
            const field = form.elements[key];
            if (!field) return;

            if (field.type === "checkbox") {
                field.checked = Boolean(data[key]);
            } else if (field.type === "radio") {
                field.checked = field.value === data[key];
            } else {
                field.value = data[key] ?? "";
            }
        });

        isDirty = false;
        unsavedIndicator.classList.add("hidden");
    }

    /* ======================================================
       NAVIGATION ◀ ▶ + UI
    ====================================================== */

    function updateNavigationUI() {
        if (!childrenIds.length || currentIndex === -1) {
            counterEl.textContent = "– / –";
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        counterEl.textContent = `${currentIndex + 1} / ${childrenIds.length}`;

        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === childrenIds.length - 1;

        prevBtn.title =
            currentIndex > 0 ?
            `← ${childrenNames[currentIndex - 1]}` :
            "Початок списку";

        nextBtn.title =
            currentIndex < childrenIds.length - 1 ?
            `${childrenNames[currentIndex + 1]} →` :
            "Кінець списку";
    }

    prevBtn.addEventListener("click", async () => {
        if (!confirmUnsavedChanges()) return;
        if (currentIndex <= 0) return;

        currentIndex--;
        await loadChildById(childrenIds[currentIndex]);
    });

    nextBtn.addEventListener("click", async () => {
        if (!confirmUnsavedChanges()) return;
        if (currentIndex >= childrenIds.length - 1) return;

        currentIndex++;
        await loadChildById(childrenIds[currentIndex]);
    });

    document.addEventListener("keydown", e => {
        if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
        if (e.key === "ArrowLeft") prevBtn.click();
        if (e.key === "ArrowRight") nextBtn.click();
    });

    /* ======================================================
       SAVE (INSERT / UPDATE)
    ====================================================== */

    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {};
        new FormData(form).forEach((v, k) => {
            if (k !== "id") payload[k] = v === "" ? null : v;
        });

        form.querySelectorAll("input[type='checkbox']").forEach(cb => {
            payload[cb.name] = cb.checked;
        });

        const id = childIdInput.value;

        const result = id ?
            await window.supabaseClient
            .from("childrens")
            .update(payload)
            .eq("id", id) :
            await window.supabaseClient
            .from("childrens")
            .insert([payload]);

        if (result.error) {
            alert("❌ Помилка збереження");
            return;
        }

        alert("✅ Збережено");

        isDirty = false;
        unsavedIndicator.classList.add("hidden");

        await loadChildrenList();
    });
});
