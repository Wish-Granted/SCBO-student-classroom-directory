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

const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});
function getMsSinceMidnight(date) {
    return (
    date.getHours() * 3600000 +
    date.getMinutes() * 60000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds()
    );
}
function setPeriodDropdown(classes) {
  const periodSelection = document.getElementById("periodSelection");
  periodSelection.length = 0; 
  const nowTime = new Date()
  let indexCount = 0
  let currentPeriod = 0
  classes.forEach(periodData => {
    const periodInfo = periodData.period_info
    const startTime = new Date(periodInfo.start_time)
    const startTimeFormatted = timeFormatter.format(startTime)
    const endTime = new Date(periodInfo.end_time)
    const endTimeFormatted = timeFormatter.format(endTime)        
    const periodName = periodInfo.period_name

    let periodOption = document.createElement("option")
    periodOption.text = periodName + " | " + startTimeFormatted + " - " + endTimeFormatted
    periodOption.value = indexCount

    periodSelection.add(periodOption)

    const nowMs = getMsSinceMidnight(nowTime)
    const startMs = getMsSinceMidnight(startTime)
    const endMs = getMsSinceMidnight(endTime)
    if (nowMs >= startMs && nowMs < endMs) {
        currentPeriod = indexCount
        periodSelection.value = indexCount
    } else if (nowMs > startMs) {
        currentPeriod = indexCount
        periodSelection.value = indexCount
    }
    indexCount++
  });

  return currentPeriod
}
function updateListTable(currentPeriod) {
  //empty list table
  const listTableBody = document.querySelector('#listTable tbody')
  listTableBody.innerHTML = '';

  loadedTimetables.forEach(studentData => {
    const newRow = document.createElement('tr');
    const periodData = studentData.timetable.classes[currentPeriod]

    let calledInfo = "Not yet called"
    if (studentData.called) {
      calledInfo = "Called at " + studentData.called_at}

    let alternateActivitiesString = "None"
    if (studentData.timetable.alternate_activities.length > 0) {
      alternateActivitiesString = ""
      let count = 0;
      studentData.timetable.alternate_activities.forEach(activity => {
        alternateActivitiesString += activity["activity_info"] + " with " + activity["activity_teacher"]
        if (count < studentData.timetable.alternate_activities.length) {
          alternateActivitiesString += "  |  "
        }
        count++
      })
    }

    newRow.innerHTML = `
      <td>${studentData.first_name + " " + studentData.last_name}</td>
      <td>${periodData.classroom_info.phone}</td>
      <td>${studentData.attendance_status}</td>
      <td>${periodData.classroom_info.location}</td>
      <td>${studentData.year_level}</td>
      <td>${periodData.class_name}</td>
      <td>${periodData.teacher_name}</td>
      <td>${calledInfo}</td>
      <td>${alternateActivitiesString}</td>
      <td>${periodData.class_code}</td>
      <td>${studentData.class}</td>
      <td>${studentData.student_id}</td>
      <td>${studentData.added_at}</td>
      <td>${studentData.username}</td>
    `;
    
    listTableBody.appendChild(newRow);
  });
}
let loadedListId = null
let loadedTimetables = {}
async function doGetAllStudentInfo(refresh=false) {
  let id = document.getElementById('openDeletelistIdBox').value;
  if (refresh) {
    id = loadedListId
  }
  if (!id) {
    document.getElementById('results').textContent = "Error, no list ID entered"
    return
  }
  const resp = await apiFetch(`/api/lists/${encodeURIComponent(id)}/info`);
  const data = await resp.json();

  console.log(data)
  loadedTimetables = data
  loadedListId = id

  const listDetailsresp = await apiFetch(`/api/lists/${encodeURIComponent(id)}`);
  const listDetails = await listDetailsresp.json();
  document.getElementById('listTitle').textContent = listDetails.name
  document.getElementById('listDescription').textContent = listDetails.description

  let currentPeriod = setPeriodDropdown(data[0]["timetable"]["classes"])
  updateListTable(currentPeriod)

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