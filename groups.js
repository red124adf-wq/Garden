// ================================
// DOM
// ================================
const leftSelect  = document.getElementById("leftGroupSelect");
const rightSelect = document.getElementById("rightGroupSelect");
const leftFilter  = document.getElementById("leftGroupFilter");
const rightFilter = document.getElementById("rightGroupFilter");
const leftList    = document.getElementById("leftList");
const rightList   = document.getElementById("rightList");

const modal       = document.getElementById("groupsModal");
const groupsList  = document.getElementById("groupsList");
const yearFilter  = document.getElementById("groupYearFilter");

// ================================
// STATE
// ================================
let groups = [];
let childrenByGroup = {};

// ================================
// LOAD GROUPS
// ================================
async function loadGroups() {
  const { data, error } = await window.supabaseClient
    .from("groups")
    .select(`
      id,
      name,
      year_start,
      year_end,
      study_start_date,
      study_end_date
    `)
    .order("year_start");

  if (error) {
    console.error("Помилка завантаження груп:", error);
    return;
  }

  groups = data || [];
  
  renderGroupSelects();

  if (rightSelect.options.length > 1) {
    rightSelect.selectedIndex = 1;
  }
}

function renderGroupSelects() {
  renderGroupSelect(leftSelect, leftFilter.value);
  renderGroupSelect(rightSelect, rightFilter.value);
}

function renderGroupSelect(select, filterValue) {
  const current = select.value;
  select.innerHTML = "";

  groups
    .filter(g => {
      const label = `${g.name} (${g.year_start}–${g.year_end})`.toLowerCase();
      return label.includes((filterValue || "").toLowerCase());
    })
    .forEach(g => {
      const label = `${g.name} (${g.year_start}–${g.year_end})`;
      const option = new Option(label, g.id);
      if (g.id === current) option.selected = true;
      select.add(option);
    });
}

// ================================
// LOAD CHILDREN
// ================================
async function loadChildren() {
  const { data, error } = await window.supabaseClient
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
    console.error("Помилка завантаження дітей:", error);
    return;
  }

  childrenByGroup = {};

  (data || []).forEach(row => {
    if (!childrenByGroup[row.group_id]) {
      childrenByGroup[row.group_id] = [];
    }
    childrenByGroup[row.group_id].push(row);
  });

  renderLists();
}

// ================================
// HELPERS
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
  ].filter(v => v && v.trim()).join(" ");

  return `${fullName} · ${formatDate(child.birth_date)}`;
}

// ================================
// RENDER CHILDREN
// ================================
function renderLists() {
  renderList(leftList, leftSelect.value, true);
  renderList(rightList, rightSelect.value, false);
}

function renderList(container, groupId, selectable) {
  container.innerHTML = "";
  const children = childrenByGroup[groupId] || [];

  children.forEach(child => {
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
  const targetGroupId = rightSelect.value;
  if (!targetGroupId) return;

  for (const id of childIds) {
    await window.supabaseClient.rpc("transfer_child_to_group", {
      p_child_id: id,
      p_group_id: targetGroupId
    });
  }

  await loadChildren();
}

// ================================
// ACTIONS
// ================================
document.getElementById("moveSelected").onclick = () => {
  const ids = [...leftList.querySelectorAll("input:checked")]
    .map(cb => cb.dataset.childId);
  if (ids.length) moveChildren(ids);
};

document.getElementById("moveAll").onclick = () => {
  const ids = [...leftList.querySelectorAll("input")]
    .map(cb => cb.dataset.childId);
  if (ids.length) moveChildren(ids);
};

leftSelect.onchange  = renderLists;
rightSelect.onchange = renderLists;

// ================================
// INIT
// ================================
(async function init() {
  if (!(await window.requireAuth())) return;
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
  const years = new Set(
    groups.map(g => `${g.year_start}-${g.year_end}`)
  );

  yearFilter.innerHTML = `<option value="">— Оберіть навчальний рік —</option>`;

  [...years].sort().forEach(y => {
    yearFilter.add(new Option(y, y));
  });
}

function renderGroupsModal() {
  groupsList.innerHTML = "";

  const year = yearFilter.value;
  if (!year) return;

  groups
    .filter(g => `${g.year_start}-${g.year_end}` === year)
    .forEach(g => {
      const row = document.createElement("div");
      row.className = "group-row";

      row.innerHTML = `
        <span>${g.name} (${g.year_start}–${g.year_end})</span>
        <div>
          <button data-edit>✏️</button>
          <button data-delete>🗑</button>
        </div>
      `;

      row.querySelector("[data-edit]").onclick = () => fillGroupForm(g);
      row.querySelector("[data-delete]").onclick = () => deleteGroup(g.id);

      groupsList.appendChild(row);
    });
}

function fillGroupForm(g) {
  document.getElementById("groupId").value = g.id;
  document.getElementById("groupName").value = g.name;
  document.getElementById("yearStart").value = g.year_start;
  document.getElementById("yearEnd").value = g.year_end;
  document.getElementById("studyStart").value = g.study_start_date || "";
  document.getElementById("studyEnd").value = g.study_end_date || "";
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
    p_name: document.getElementById("groupName").value,
    p_year_start: +document.getElementById("yearStart").value,
    p_year_end: +document.getElementById("yearEnd").value,
    p_study_start_date: document.getElementById("studyStart").value,
    p_study_end_date: document.getElementById("studyEnd").value
  };

  if (id) {
    await window.supabaseClient.rpc("groups_update", {
      p_group_id: id,
      ...payload
    });
  } else {
    await window.supabaseClient.rpc("groups_create", payload);
  }

  await loadGroups();
  renderGroupsModal();
  clearGroupForm();
};

async function deleteGroup(id) {
  if (!confirm("Видалити групу?")) return;

  const { error } = await window.supabaseClient.rpc(
    "groups_delete_if_empty",
    { p_group_id: id }
  );

  if (error) {
    alert(error.message);
    return;
  }

  await loadGroups();
  renderGroupsModal();
}

yearFilter.onchange = renderGroupsModal;

// ================================
// Фільтри
// ================================
leftFilter.oninput = () => {
  renderGroupSelect(leftSelect, leftFilter.value);
  renderLists();
};

rightFilter.oninput = () => {
  renderGroupSelect(rightSelect, rightFilter.value);
  renderLists();
};
