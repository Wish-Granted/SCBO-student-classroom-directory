async function doGetLists() {
  const resp = await apiFetch('/api/lists');
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doCreateList() {
  const name = document.getElementById('listNameBox').value;
  const description = document.getElementById('listDescriptionBox').value;
  const resp = await apiFetch('/api/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doGetListDetail() {
  const id = document.getElementById('openDeletelistIdBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(id)}`);
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doDeleteList() {
  const id = document.getElementById('openDeletelistIdBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doGetAllStudentInfo() {
  const id = document.getElementById('openDeletelistIdBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(id)}/info`);
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doUpdateListDetails() {
  const id = document.getElementById('updateListIdBox').value;
  const name = document.getElementById('updateListNameBox').value;
  const description = document.getElementById('updateListDescriptionBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doAddStudentToList() {
  const listId = document.getElementById('calledDeleteAddListIdBox').value;
  const studentId = document.getElementById('calledDeleteAddStudentIdBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(listId)}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_ids: [studentId] }),
  });
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doRemoveStudentFromList() {
  const listId = document.getElementById('calledDeleteAddListIdBox').value;
  const studentId = document.getElementById('calledDeleteAddStudentIdBox').value;
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(listId)}/students/${studentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doMarkCalled(called) {
  const listId = document.getElementById('calledDeleteAddListIdBox').value;
  const studentId = document.getElementById('calledDeleteAddStudentIdBox').value;
  const resp = await apiFetch(
    `/api/lists/${encodeURIComponent(listId)}/students/${encodeURIComponent(studentId)}/called`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ called }),
    }
  );
  const data = await resp.json();
  document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}