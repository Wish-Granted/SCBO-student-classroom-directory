const studentSearchBox = document.getElementById("studentSearchBox");
const studentTableBody = document.getElementById("studentTableBody");
const selectedStudentsTableBody = document.getElementById("selectedStudentsTableBody");
const selectAllStudents = document.getElementById("selectAllStudents");

const notes = document.getElementById("notes");

document.getElementById("reloadSelected").addEventListener("click", reloadSelected);
document.getElementById("removeAllSelected").addEventListener("click", removeAllSelected);

const searchTable = studentTableBody.closest("table");
const selectedTable = selectedStudentsTableBody.closest("table");

let searchCounter = 0;  // used to guard against out-of-order responses while typing
let currentData = [];   // the last search results (unsorted)

// escape stuff from server before putting it in an html string
function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

const WARNING_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2" /></svg>`;
const TRASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" class="bi bi-trash3-fill" viewBox="0 0 16 16"><path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5" /></svg>`;
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-square-fill" viewBox="0 0 16 16"><path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z" /></svg>`;

const STATUS_DISPLAY = {
    absent: { cls: "text-danger", icon: WARNING_ICON, rank: 2 },
    alternate: { cls: "text-warning", icon: WARNING_ICON, rank: 0 },
    present: { cls: "text-success", icon: CHECK_ICON, rank: 0 },
    unknown: { cls: "text-secondary", icon: WARNING_ICON, rank: 1 },
};

const calledIds = new Set();
let selectedStudents = [];

const isSelected = (id) => selectedStudents.some((s) => s.id === id);

// Table sorting stuff vv

const searchSort = { key: "name", dir: 1 };   // default for the search table
const selectedSort = { key: "called", dir: 1 };    // default for the selected table

//for sorting
const SEARCH_TIEBREAKERS = ["name"];
const SELECTED_TIEBREAKERS = ["status", "year_level", "phone", "class", "name"];

new bootstrap.Tooltip(document.body, {
    selector: '[data-bs-toggle="tooltip"]',
    animation: false,
});

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const isBlank = (v) => v === undefined || v === null || v === "";

function compareBy(get, a, b, dir) {
    const x = get(a);
    const y = get(b);
    const xBlank = isBlank(x);
    const yBlank = isBlank(y);
    if (xBlank || yBlank) return xBlank === yBlank ? 0 : xBlank ? 1 : -1;
    return collator.compare(String(x), String(y)) * dir;
}

function sortData(data, values, state, tiebreakers) {
    const keys = [state.key, ...tiebreakers];
    return [...data].sort((a, b) => {
        for (let i = 0; i < keys.length; i++) {
            const result = compareBy(values[keys[i]], a, b, i === 0 ? state.dir : 1);
            if (result !== 0) return result;
        }
        return 0;
    });
}

const fullName = (s) => `${s.first_name} ${s.last_name}`;

const searchSortValues = {
    selected: (s) => (isSelected(s.id) ? 0 : 1),
    name: fullName,
    year_level: (s) => s.year_level,
    class: (s) => s.class,
    id: (s) => s.id,
    username: (s) => s.username,
};

const minutesOf = (iso) => {
    const m = /T(\d{2}):(\d{2})/.exec(iso ?? "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const selectedSortValues = {
    called: (s) => (calledIds.has(s.id) ? 0 : 1),
    status: (s) => STATUS_DISPLAY[getStatus(s)?.key]?.rank,
    name: fullName,
    phone: (s) => currentSlot(s)?.phone,
    year_level: (s) => s.year_level,
    location: (s) => currentSlot(s)?.location,
    class_name: (s) => currentSlot(s)?.class_name,
    teacher: (s) => currentSlot(s)?.teacher,
    class_code: (s) => currentSlot(s)?.class_code,
    class: (s) => s.class,
    id: (s) => s.id,
    username: (s) => s.username,
};

function updateSortIndicators(table, state) {
    table.querySelectorAll("th[data-sort]").forEach((th) => {
        if (th.dataset.sort === state.key) {
            th.setAttribute("aria-sort", state.dir === 1 ? "ascending" : "descending");
        } else {
            th.removeAttribute("aria-sort");
        }
    });
}

function bindSortHeaders(table, state, onChange) {
    table.querySelectorAll("th[data-sort]").forEach((th) => {
        th.addEventListener("click", (event) => {
            if (event.target.closest("input")) return;

            const key = th.dataset.sort;
            if (key === state.key) {
                state.dir *= -1;
            } else {
                state.key = key;
                state.dir = 1;
            }
            onChange();
        });
    });
}

bindSortHeaders(searchTable, searchSort, renderStudents);
bindSortHeaders(selectedTable, selectedSort, () => {
    renderSelected();
    saveState();
});

// For selection persistance vv
const STORAGE_KEY = "bminerva.selectedStudents";

function saveState() {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            students: selectedStudents,
            called: [...calledIds],
            sort: selectedSort,
        }));
    } catch (err) {
        console.error("Could not save selection:", err);
    }
}

function restoreState() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
        if (!saved) { renderSelected(); return; };

        if (Array.isArray(saved.students)) selectedStudents = saved.students;
        (saved.called ?? []).forEach((id) => calledIds.add(id));
        if (saved.sort && selectedSortValues[saved.sort.key]) {
            selectedSort.key = saved.sort.key;
            selectedSort.dir = saved.sort.dir === -1 ? -1 : 1;
        }
    } catch (err) {
        console.error("Could not restore selection:", err);
        selectedStudents = [];
    }

    renderSelected();
    // anything that never finished loading (or failed) last time gets fetched again
    selectedStudents
        .filter((s) => s.timetable === undefined || s.loadFailed)
        .forEach((s) => loadTimetable(s.id));
}

// SEARCH vv

studentSearchBox.addEventListener("input", (event) => {
    doStudentSearch(event.target.value)
});

selectAllStudents.addEventListener("change", (event) => {
    if (event.target.checked) selectStudents(currentData);
    else deselectStudents(currentData.map((s) => s.id));
});

studentTableBody.addEventListener("change", (event) => {
    if (!event.target.classList.contains("student-check")) return;
    const id = event.target.closest("tr").dataset.studentId;
    if (event.target.checked) selectStudents([currentData.find((s) => s.id === id)]);
    else deselectStudents([id]);
});

async function doStudentSearch(query) {
    const thisSearch = ++searchCounter;

    try {
        const resp = await apiFetch(`/api/students/search?q=${encodeURIComponent(query)}`);
        const data = await resp.json();

        // Ignore this response if a newer search has started since
        if (thisSearch !== searchCounter) return;

        currentData = data.map((s) => ({ ...s, id: String(s.id) }));
        renderStudents();
    } catch (err) {
        console.error("Student search failed:", err);
    }
}

function updateSelectAllState() {
    selectAllStudents.checked =
        currentData.length > 0 && currentData.every((s) => isSelected(s.id));
}

function renderStudents() {
    studentTableBody.innerHTML = "";

    for (const student of sortData(currentData, searchSortValues, searchSort, SEARCH_TIEBREAKERS)) {
        const row = studentTableBody.insertRow();
        row.dataset.studentId = student.id;

        const checkCell = row.insertCell();
        const wrapper = document.createElement("div");
        wrapper.className = "form-check";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "form-check-input student-check";
        checkbox.checked = isSelected(student.id);
        wrapper.appendChild(checkbox);
        checkCell.appendChild(wrapper);

        const values = [
            `${student.first_name} ${student.last_name}`,
            student.year_level,
            student.class,
            student.id,
            student.username,
        ];

        for (const value of values) {
            row.insertCell().textContent = value ?? "";
        }
    }
    updateSortIndicators(searchTable, searchSort);
    updateSelectAllState();
}

// SELECTED STUDENTS vv

function buildSelectedRow(student, isCalled) {
    const timetable = student.timetable;
    const loading = timetable === undefined;
    const cur = currentSlot(student);

    const status = getStatus(student);
    const display = status && STATUS_DISPLAY[status.key];

    const statusCell = status
        ? `<span class="${display.cls}" data-bs-toggle="tooltip" data-bs-placement="top"
                 data-bs-title="${esc(status.tip)}">${display.icon}</span>`
        : "";

    // Shown in the timetable columns until the request resolves
    const t = (value) => loading
        ? `<span class="placeholder-glow"><span class="placeholder col-8"></span></span>`
        : esc(value);

    return `
        <tr data-student-id="${esc(student.id)}">
            <td class="align-middle">
                <div class="d-flex align-items-center justify-content-center gap-2">
                    <input class="form-check-input m-0 called-check" type="checkbox" ${isCalled ? "checked" : ""}>
                </div>
            </td>
            <td>
                <button type="button" class="btn p-0 border-0 button-hover d-flex align-items-center remove-btn"
                        data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Remove this selection">
                    ${TRASH_ICON}
                </button>
            </td>
            <td>${statusCell}</td>
            <td>${esc(student.first_name)} ${esc(student.last_name)}</td>
            <td>${t(cur?.phone)}</td>
            <td>${esc(student.year_level)}</td>
            <td>${t(cur?.location)}</td>
            <td>${t(cur?.class_name)}</td>
            <td>${t(cur?.teacher)}</td>
            <td>${t(cur?.class_code)}</td>
            <td>${esc(student.class)}</td>
            <td>${esc(student.id)}</td>
            <td>${esc(student.username)}</td>
        </tr>`;
}

function renderSelected() {
    selectedStudentsTableBody.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
        bootstrap.Tooltip.getInstance(el)?.dispose();
    });
    selectedStudentsTableBody.innerHTML = sortData(
        selectedStudents, selectedSortValues, selectedSort, SELECTED_TIEBREAKERS
    )
        .map((s) => buildSelectedRow(s, calledIds.has(s.id)))
        .join("");
    updateSortIndicators(selectedTable, selectedSort);
}

let renderQueued = false;
function scheduleRenderSelected() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
        renderQueued = false;
        renderSelected();
    });
}

selectedStudentsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-btn");
    if (!button) return;
    const id = button.closest("tr").dataset.studentId;
    deselectStudents([id]);
});

selectedStudentsTableBody.addEventListener("change", (event) => {
    if (!event.target.classList.contains("called-check")) return;
    const id = event.target.closest("tr").dataset.studentId;
    if (event.target.checked) calledIds.add(id);
    else calledIds.delete(id);
    saveState();
});

function selectStudents(students) {
    const added = students
        .filter((s) => !isSelected(s.id))
        .map((s) => ({ ...s, timetable: undefined }));  // undefined = still loading
    if (added.length === 0) return;

    selectedStudents.push(...added);
    saveState();
    renderSelected();
    renderStudents();
    added.forEach((s) => loadTimetable(s.id));
}

function deselectStudents(ids) {
    const remove = new Set(ids);
    selectedStudents = selectedStudents.filter((s) => !remove.has(s.id));
    ids.forEach((id) => calledIds.delete(id));
    saveState();
    renderSelected();
    renderStudents();   // untick in the left table
}

async function loadTimetable(id) {
    let info;
    let failed = false;
    try {
        const resp = await apiFetch(`/api/eminerva/info/${encodeURIComponent(id)}`);
        if (resp.ok === false) throw new Error(`HTTP ${resp.status}`);
        info = await resp.json();
    } catch (err) {
        console.error("Timetable load failed:", err);
        failed = true;
        info = { timetable: {}, attendance_status: "" };
    }

    const student = selectedStudents.find((s) => s.id === id);
    if (!student) return;                   // deselected while the request was in flight
    student.timetable = info.timetable ?? {};
    student.attendance_status = info.attendance_status ?? "";
    student.loadFailed = failed
    saveState()
    renderSelected();
}

const describeActivity = (a) => {
    if (typeof a === "string") return a;
    const info = a?.activity_info ?? "";
    const teacher = a?.activity_teacher;
    return teacher ? `${info} (${teacher})` : info;
};

function getStatus(student) {
    if (student.timetable === undefined) return null;   // still loading
    if (student.loadFailed) return { key: "unknown", tip: "Couldn't load attendance" };

    const alt = student.timetable.alternate_activities ?? [];
    const altText = alt.length ? `Alternate activities:\n${alt.map(describeActivity).join("\n")}` : "";

    if (String(student.attendance_status).includes("Presence")) {
        return {
            key: altText ? "alternate" : "present",
            tip: altText ? `Student present.\n${altText}` : "Student present",
        };
    }
    return {
        key: "absent",
        tip: altText ? `Student not present.\n${altText}` : "Student not present",
    };
}

function currentSlot(student, now = new Date()) {
    const classes = (student.timetable?.classes ?? [])
        .map((c) => ({
            c,
            start: minutesOf(c.period_info?.start_time),
            end: minutesOf(c.period_info?.end_time),
        }))
        .filter((x) => x.start !== null && x.end !== null)
        .sort((a, b) => a.start - b.start);

    const mins = now.getHours() * 60 + now.getMinutes();
    const pick =
        classes.find((x) => mins >= x.start && mins < x.end) ??
        classes.find((x) => x.start > mins) ??
        classes[classes.length - 1];   // school is finished, show their last class
    if (!pick) return null;

    const c = pick.c;
    return {
        phone: c.classroom_info?.phone,
        location: c.classroom_info?.location,
        class_name: c.class_name,
        teacher: c.teacher_name,
        class_code: c.class_code,
    };
}

function reloadSelected() {
    selectedStudents.forEach((s) => {
        s.timetable = undefined;
        s.loadFailed = false;
    });
    renderSelected();
    selectedStudents.forEach((s) => loadTimetable(s.id));
}

function removeAllSelected() {
    selectedStudents = [];
    saveState();
    renderSelected();
    renderStudents();
}

// NOTES vv

const NOTES_SAVE_DELAY = 800;        // ms to wait after typing stops
const NOTES_POLL_INTERVAL = 15000;   // ms between checks for other people's edits

let notesSaveTimer = null;
let notesDirty = false;    // local edits not yet saved
let notesSaving = false;

notes.addEventListener("input", () => {
    notesDirty = true;
    clearTimeout(notesSaveTimer);
    notesSaveTimer = setTimeout(saveNotes, NOTES_SAVE_DELAY);
});

async function saveNotes() {
    notesSaving = true;
    const text = notes.value;

    try {
        const resp = await apiFetch("/api/notes/", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notes: text }),
        });
        if (resp.ok === false) throw new Error(`HTTP ${resp.status}`);

        // if more was typed, pending timer will save again
        if (notes.value === text) {
            notesDirty = false;
        }

    } catch (err) {
        console.error("Notes save failed:", err);
        notesSaveTimer = setTimeout(saveNotes, 5000);

    } finally {
        notesSaving = false;
    }
}

async function loadNotes() {
    try {
        const resp = await apiFetch("/api/notes/");
        if (resp.ok === false) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        // never overwrite text the user is in the middle of editing
        if (notesDirty || notesSaving) return;

        if (notes.value !== data.notes) {
            const { selectionStart, selectionEnd } = notes;
            notes.value = data.notes;
            notes.setSelectionRange(selectionStart, selectionEnd);
        }
    } catch (err) {
        console.error("Notes load failed:", err);
    }
}

loadNotes();
setInterval(loadNotes, NOTES_POLL_INTERVAL);

doStudentSearch("")

// selected students
restoreState();
setInterval(renderSelected, 60000); // rerender every minute to check for period changes