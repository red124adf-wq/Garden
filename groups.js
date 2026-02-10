// ================================
// DOM
// ================================
const leftSelect = document.getElementById("leftGroupSelect");
const rightSelect = document.getElementById("rightGroupSelect");
const leftFilter = document.getElementById("leftGroupFilter");
const rightFilter = document.getElementById("rightGroupFilter");
const leftList = document.getElementById("leftList");
const rightList = document.getElementById("rightList");

const modal = document.getElementById("groupsModal");
const groupsList = document.getElementById("groupsList");
const yearFilter = document.getElementById("groupYearFilter");

let supabaseClientRef = null;

// ================================
// STATE
// ================================
let groups = [];
let childrenByGroup = {};

// ================================
// HELPERS
// ================================
function getSupabase() {
  if (!supabaseClientRef) {
    supabaseClientRef = window.supabaseClient || window.supabase;
  }
  return supabaseClientRef;
}

function showError(message) {
  console.error(message);
  alert(`❌ ${message}`);
}

function showSuccess(message) {
  alert(`✅ ${message}`);
}

function toYearLabel(group) {
  return `${group.name} (${group.year_start}–${group.year_end})`;
}

function setSelectPlaceholder(select, text) {
  select.innerHTML = "";
  select.add(new Option(text, ""));
}

function ensureDifferentSelectedGroups() {
  if (!leftSelect.value || !rightSelect.value || leftSelect.value !== rightSelect.value) {
    return;
  }

  const candidate = [...rightSelect.options].find(
    (opt) => opt.value && opt.value !== leftSelect.value
  );

  if (candidate) {
    rightSelect.value = candidate.value;
  }
}

// ================================
// LOAD GROUPS
// ================================
async function loadGroups() {
  const client = getSupabase();
  if (!client) {
    showError("Supabase не ініціалізовано");
    return;
  }

  const prevLeft = leftSelect.value;
  const prevRight = rightSelect.value;

  const { data, error } = await client
    .from("groups")
    .select(`
      id,
      name,
      year_start,
      year_end,
      study_start_date,
      study_end_date
    `)
    .order("year_start")
    .order("name");

  if (error) {
    showError("Помилка завантаження груп");
    return;
  }

  groups = data || [];
  renderGroupSelects(prevLeft, prevRight);
}

function renderGroupSelects(prevLeft = "", prevRight = "") {
  renderGroupSelect(leftSelect, leftFilter.value, prevLeft, "— Оберіть джерельну групу —");
  renderGroupSelect(rightSelect, rightFilter.value, prevRight, "— Оберіть цільову групу —");

  ensureDifferentSelectedGroups();
  renderLists();
}

function renderGroupSelect(select, filterValue, preferredValue, placeholderText) {
  setSelectPlaceholder(select, placeholderText);

  const normalizedFilter = (filterValue || "").toLowerCase();
  const filtered = groups.filter((group) =>
    toYearLabel(group).toLowerCase().includes(normalizedFilter)
  );

  filtered.forEach((group) => {
    select.add(new Option(toYearLabel(group), group.id));
  });

  if (preferredValue && [...select.options].some((opt) => opt.value === preferredValue)) {
    select.value = preferredValue;
  } else if (select.options.length > 1) {
    select.selectedIndex = 1;
  }
}

// ================================
// LOAD CHILDREN
// ================================
async function loadChildren() {
  const client = getSupabase();
  if (!client) {
    showError("Supabase не ініціалізовано");
    return;
  }

  const { data, error } = await client
    .from("children_current_groups")
    .select(`
      child_id,
      group_id,
      last_name,
      first_name,
      middle_name,
      birth_date
    `);

  if (error) {
    showError("Помилка завантаження дітей");
    return;
  }

  childrenByGroup = {};

  (data || []).forEach((row) => {
    if (!childrenByGroup[row.group_id]) {
      childrenByGroup[row.group_id] = [];
    }
    childrenByGroup[row.group_id].push(row);
  });

  renderLists();
}

// ================================
// RENDER CHILDREN
// ================================
function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("uk-UA");
}

function buildChildLabel(child) {
  const fullName = [
    child.last_name,
    child.first_name,
    child.middle_name
  ].filter((value) => value && value.trim()).join(" ");

  return `${fullName} · ${formatDate(child.birth_date)}`;
}

function renderLists() {
  renderList(leftList, leftSelect.value, true);
  renderList(rightList, rightSelect.value, false);
}

function renderList(container, groupId, selectable) {
  container.innerHTML = "";

  if (!groupId) {
    const empty = document.createElement("div");
    empty.className = "list-placeholder";
    empty.textContent = "Оберіть групу";
    container.appendChild(empty);
    return;
  }

  const children = childrenByGroup[groupId] || [];

  if (children.length === 0) {
    const empty = document.createElement("div");
    empty.className = "list-placeholder";
    empty.textContent = "У цій групі немає дітей";
    container.appendChild(empty);
    return;
  }

  children.forEach((child) => {
    const row = document.createElement("div");
    row.className = "child";

    if (selectable) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.childId = child.child_id;
      row.appendChild(cb);
    }

    const label = document.createElement("span");
    label.textContent = buildChildLabel(child);

    row.appendChild(label);
    container.appendChild(row);
  });
}

// ================================
// MOVE CHILDREN
// ================================
async function moveChildren(childIds) {
  const sourceGroupId = leftSelect.value;
  const targetGroupId = rightSelect.value;

  if (!sourceGroupId) {
    alert("Оберіть групу, з якої потрібно перевести дітей");
    return;
  }

  if (!targetGroupId) {
    alert("Оберіть групу, в яку потрібно перевести дітей");
    return;
  }

  if (sourceGroupId === targetGroupId) {
    alert("Групи мають бути різними");
    return;
  }

  for (const childId of childIds) {
    const client = getSupabase();
    if (!client) {
      showError("Supabase не ініціалізовано");
      return;
    }

    const { error } = await client.rpc("transfer_child_to_group", {
      p_child_id: childId,
      p_group_id: targetGroupId
    });

    if (error) {
      showError(`Не вдалося перевести частину дітей: ${error.message}`);
      break;
    }
  }

  await loadChildren();
  showSuccess("Переміщення виконано");
}

// ================================
// ACTIONS
// ================================
document.getElementById("moveSelected").onclick = () => {
  const ids = [...leftList.querySelectorAll("input:checked")]
    .map((cb) => cb.dataset.childId);

  if (!ids.length) {
    alert("Оберіть хоча б одну дитину");
    return;
  }

  moveChildren(ids);
};

document.getElementById("moveAll").onclick = () => {
  const ids = [...leftList.querySelectorAll("input")]
    .map((cb) => cb.dataset.childId);

  if (!ids.length) {
    alert("У вибраній групі немає дітей для переміщення");
    return;
  }

  moveChildren(ids);
};

leftSelect.onchange = () => {
  ensureDifferentSelectedGroups();
  renderLists();
};

rightSelect.onchange = () => {
  ensureDifferentSelectedGroups();
  renderLists();
};

// ================================
// INIT
// ================================
(async function init() {
  if (!(await window.requireAuth())) return;

  supabaseClientRef = getSupabase();
  if (!supabaseClientRef) {
    showError("Supabase не ініціалізовано");
    return;
  }

  await loadGroups();
  await loadChildren();
})();

// ================================
// MODAL: GROUP MANAGEMENT
// ================================
document.getElementById("openGroupsModal").onclick = () => {
  clearGroupForm();
  populateYearFilter();
  renderGroupsModal();
  modal.classList.remove("hidden");
};

document.getElementById("closeGroupsModal").onclick = () => {
  modal.classList.add("hidden");
};

document.getElementById("clearGroupForm").onclick = () => {
  clearGroupForm();
};

// ================================
// MODAL HELPERS
// ================================
function populateYearFilter() {
  const years = new Set(groups.map((g) => `${g.year_start}-${g.year_end}`));

  yearFilter.innerHTML = `<option value="">— Оберіть навчальний рік —</option>`;

  [...years].sort().forEach((year) => {
    yearFilter.add(new Option(year, year));
  });
}

function renderGroupsModal() {
  groupsList.innerHTML = "";

  const selectedYear = yearFilter.value;
  if (!selectedYear) {
    const empty = document.createElement("p");
    empty.className = "modal-placeholder";
    empty.textContent = "Спочатку оберіть навчальний рік";
    groupsList.appendChild(empty);
    return;
  }

  const list = groups.filter((g) => `${g.year_start}-${g.year_end}` === selectedYear);

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "modal-placeholder";
    empty.textContent = "Для вибраного року груп не знайдено";
    groupsList.appendChild(empty);
    return;
  }

  list.forEach((group) => {
    const row = document.createElement("div");
    row.className = "group-row";

    row.innerHTML = `
      <span>${group.name} (${group.year_start}–${group.year_end})</span>
      <div>
        <button data-edit type="button">✏️</button>
        <button data-delete type="button">🗑</button>
      </div>
    `;

    row.querySelector("[data-edit]").onclick = () => fillGroupForm(group);
    row.querySelector("[data-delete]").onclick = () => deleteGroup(group.id);

    groupsList.appendChild(row);
  });
}

function fillGroupForm(group) {
  document.getElementById("groupId").value = group.id;
  document.getElementById("groupName").value = group.name;
  document.getElementById("yearStart").value = group.year_start;
  document.getElementById("yearEnd").value = group.year_end;
  document.getElementById("studyStart").value = group.study_start_date || "";
  document.getElementById("studyEnd").value = group.study_end_date || "";
}

function clearGroupForm() {
  document.getElementById("groupId").value = "";
  document.getElementById("groupName").value = "";
  document.getElementById("yearStart").value = "";
  document.getElementById("yearEnd").value = "";
  document.getElementById("studyStart").value = "";
  document.getElementById("studyEnd").value = "";
}

// ================================
// SAVE / DELETE GROUP
// ================================
document.getElementById("saveGroup").onclick = async () => {
  const id = document.getElementById("groupId").value;

  const payload = {
    p_name: document.getElementById("groupName").value.trim(),
    p_year_start: +document.getElementById("yearStart").value,
    p_year_end: +document.getElementById("yearEnd").value,
    p_study_start_date: document.getElementById("studyStart").value,
    p_study_end_date: document.getElementById("studyEnd").value
  };

  if (!payload.p_name || !payload.p_year_start || !payload.p_year_end) {
    alert("Заповніть назву групи та роки навчання");
    return;
  }

  if (payload.p_year_end < payload.p_year_start) {
    alert("Рік завершення не може бути меншим за рік початку");
    return;
  }

  if (payload.p_study_start_date && payload.p_study_end_date && payload.p_study_end_date < payload.p_study_start_date) {
    alert("Дата завершення не може бути раніше дати початку");
    return;
  }

  const client = getSupabase();
  if (!client) {
    showError("Supabase не ініціалізовано");
    return;
  }

  const { error } = id
    ? await client.rpc("groups_update", { p_group_id: id, ...payload })
    : await client.rpc("groups_create", payload);

  if (error) {
    showError(`Не вдалося зберегти групу: ${error.message}`);
    return;
  }

  await loadGroups();
  populateYearFilter();
  renderGroupsModal();
  clearGroupForm();
  showSuccess("Групу збережено");
};

async function deleteGroup(id) {
  if (!confirm("Видалити групу?")) return;

  const client = getSupabase();
  if (!client) {
    showError("Supabase не ініціалізовано");
    return;
  }

  const { error } = await client.rpc("groups_delete_if_empty", { p_group_id: id });

  if (error) {
    showError(error.message);
    return;
  }

  await loadGroups();
  populateYearFilter();
  renderGroupsModal();
  showSuccess("Групу видалено");
}

yearFilter.onchange = renderGroupsModal;

// ================================
// FILTERS
// ================================
leftFilter.oninput = () => {
  renderGroupSelect(leftSelect, leftFilter.value, leftSelect.value, "— Оберіть джерельну групу —");
  ensureDifferentSelectedGroups();
  renderLists();
};

rightFilter.oninput = () => {
  renderGroupSelect(rightSelect, rightFilter.value, rightSelect.value, "— Оберіть цільову групу —");
  ensureDifferentSelectedGroups();
  renderLists();
};
