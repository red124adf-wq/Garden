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

  const studyYearSelect = document.getElementById("studyYearSelect");
  const groupSelect = document.getElementById("groupSelect");

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
    birth: document.getElementById("f_birth_date"),
    cert: document.getElementById("f_certificate")
  };

  /* ======================================================
     STATE
  ====================================================== */
  let childrenIds = [];
  let currentIndex = -1;
  let selectedChild = null;
  let isDirty = false;

  /* ======================================================
     DIRTY TRACKING
  ====================================================== */
  form.addEventListener("input", () => {
    isDirty = true;
    unsavedIndicator.classList.remove("hidden");
  });

  function confirmUnsavedChanges() {
    if (!isDirty) return true;
    return confirm("Є незбережені зміни. Продовжити без збереження?");
  }

  /* ======================================================
     GROUP UI HELPERS
  ====================================================== */
  function resetGroupUI() {
    studyYearSelect.value = "";
    groupSelect.innerHTML = `<option value="">— Оберіть групу —</option>`;
    groupSelect.disabled = true;
  }

  /* ======================================================
     LOAD STUDY YEARS
  ====================================================== */
  async function loadStudyYears() {
    resetGroupUI();

    const { data, error } = await window.supabaseClient
      .from("groups")
      .select("year_start, year_end")
      .order("year_start", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    const years = new Set(
      data.map(g => `${g.year_start}-${g.year_end}`)
    );

    studyYearSelect.innerHTML =
      `<option value="">— Оберіть навчальний рік —</option>`;

    [...years].forEach(y =>
      studyYearSelect.add(new Option(y, y))
    );
  }

  async function loadGroupsByYear(yearRange) {
    groupSelect.innerHTML =
      `<option value="">— Оберіть групу —</option>`;
    groupSelect.disabled = true;

    if (!yearRange) return;

    const [ys, ye] = yearRange.split("-").map(Number);

    const { data, error } = await window.supabaseClient
      .from("groups")
      .select("id, name")
      .eq("year_start", ys)
      .eq("year_end", ye)
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    data.forEach(g =>
      groupSelect.add(new Option(g.name, g.id))
    );

    groupSelect.disabled = false;
  }

  studyYearSelect.addEventListener("change", e =>
    loadGroupsByYear(e.target.value)
  );

  /* ======================================================
     LOAD CURRENT GROUP FOR CHILD
  ====================================================== */
  async function loadCurrentGroupForChild(childId) {
    resetGroupUI();

    const { data } = await window.supabaseClient
      .from("child_group_history")
      .select(`
        group_id,
        groups ( year_start, year_end )
      `)
      .eq("child_id", childId)
      .eq("is_current", true)
      .single();

    if (!data) return;

    const yearValue =
      `${data.groups.year_start}-${data.groups.year_end}`;

    studyYearSelect.value = yearValue;
    await loadGroupsByYear(yearValue);
    groupSelect.value = data.group_id;
  }

  /* ======================================================
     LOAD CHILDREN LIST
  ====================================================== */
  async function loadChildrenList() {
    const { data, error } = await window.supabaseClient
      .from("childrens")
      .select("id")
      .order("last_name");

    if (error) {
      console.error(error);
      return;
    }

    childrenIds = data.map(c => c.id);
    updateNavigationUI();
  }

  /* ======================================================
     SEARCH
  ====================================================== */
  openSearchBtn.onclick = () => {
    if (!confirmUnsavedChanges()) return;
    modal.classList.remove("hidden");
    runSearch();
  };

  cancelBtn.onclick = () => {
    modal.classList.add("hidden");
    selectedChild = null;
    resultsList.innerHTML = "";
  };

  confirmBtn.onclick = async () => {
    if (!selectedChild) return;
    currentIndex = childrenIds.indexOf(selectedChild.id);
    await openChild(selectedChild);
    modal.classList.add("hidden");
    updateNavigationUI();
  };

  Object.values(filters).forEach(i =>
    i.addEventListener("input", runSearch)
  );

  async function runSearch() {
    let q = window.supabaseClient
      .from("childrens")
      .select("*")
      .order("last_name")
      .limit(5);

    if (filters.last.value)
      q = q.ilike("last_name", `%${filters.last.value}%`);
    if (filters.first.value)
      q = q.ilike("first_name", `%${filters.first.value}%`);
    if (filters.birth.value)
      q = q.eq("birth_date", filters.birth.value);
    if (filters.cert.value)
      q = q.ilike("birth_certificate", `%${filters.cert.value}%`);

    const { data } = await q;

    resultsList.innerHTML = "";
    selectedChild = null;

    data.forEach(c => {
      const li = document.createElement("li");
      li.textContent = `${c.last_name} ${c.first_name}`;
      li.onclick = () => {
        selectedChild = c;
        [...resultsList.children].forEach(x =>
          x.classList.remove("active")
        );
        li.classList.add("active");
      };
      resultsList.appendChild(li);
    });
  }

  /* ======================================================
     FORM
  ====================================================== */
  function fillForm(data) {
    childIdInput.value = data.id;

    form.querySelectorAll("input[type=radio]")
      .forEach(r => r.checked = false);

    Object.keys(data).forEach(k => {
      const f = form.elements[k];
      if (!f) return;

      if (f.type === "checkbox") f.checked = !!data[k];
      else if (f.type === "radio") f.checked = f.value === data[k];
      else f.value = data[k] ?? "";
    });

    isDirty = false;
    unsavedIndicator.classList.add("hidden");
  }

  async function openChild(data) {
    fillForm(data);
    await loadCurrentGroupForChild(data.id);
  }

  /* ======================================================
     NAVIGATION
  ====================================================== */
  function updateNavigationUI() {
    if (!childrenIds.length || currentIndex === -1) {
      counterEl.textContent = "– / –";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    counterEl.textContent =
      `${currentIndex + 1} / ${childrenIds.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled =
      currentIndex === childrenIds.length - 1;
  }

  async function loadChildById(id) {
    const { data, error } = await window.supabaseClient
      .from("childrens")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    await openChild(data);
    updateNavigationUI();
  }

  prevBtn.onclick = async () => {
    if (!confirmUnsavedChanges() || currentIndex <= 0) return;
    currentIndex--;
    await loadChildById(childrenIds[currentIndex]);
  };

  nextBtn.onclick = async () => {
    if (
      !confirmUnsavedChanges() ||
      currentIndex >= childrenIds.length - 1
    ) return;
    currentIndex++;
    await loadChildById(childrenIds[currentIndex]);
  };

  /* ======================================================
     SAVE
  ====================================================== */
  form.addEventListener("submit", async e => {
    e.preventDefault();

    const selectedYear = studyYearSelect.value;
    const selectedGroup = groupSelect.value;

    if (selectedYear && !selectedGroup) {
      alert("❗ Оберіть групу для вибраного навчального року");
      return;
    }

    const payload = {};
    new FormData(form).forEach((v, k) => {
      if (!["id", "study_year", "group_id"].includes(k)) {
        payload[k] = v === "" ? null : v;
      }
    });

    form.querySelectorAll("input[type=checkbox]")
      .forEach(cb => payload[cb.name] = cb.checked);

    let childId = childIdInput.value;

    if (childId) {
      await window.supabaseClient
        .from("childrens")
        .update(payload)
        .eq("id", childId);
    } else {
      const { data } = await window.supabaseClient
        .from("childrens")
        .insert([payload])
        .select("id")
        .single();

      childId = data.id;
      childIdInput.value = childId;
      currentIndex = childrenIds.length;
    }

    if (selectedGroup) {
      await window.supabaseClient.rpc(
        "transfer_child_to_group",
        {
          p_child_id: childId,
          p_group_id: selectedGroup
        }
      );
    }

    alert("✅ Збережено");
    isDirty = false;
    unsavedIndicator.classList.add("hidden");

    await loadChildrenList();
    updateNavigationUI();
  });

  /* ======================================================
     INIT
  ====================================================== */
  await loadChildrenList();
  await loadStudyYears();
});
