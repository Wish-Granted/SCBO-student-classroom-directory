
const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
});

let loadedTimetables = {}

function getMsSinceMidnight(date) {
    return (
    date.getHours() * 3600000 +
    date.getMinutes() * 60000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds()
    );
}

async function getStudentById(studentId) {
    const resp = await apiFetch(`/api/students/${encodeURIComponent(studentId)}`);
    const data = await resp.json();

    console.log(data)
    return data
}

function displayStudentData(data) {
    let studentTable = document.getElementById("studentTable");
    studentTable.innerHTML = ""; 
    for (let r = 0; r < data.length+1; r++) {
        let row = studentTable.insertRow();

        for (let c = 0; c < 5; c++) {
            let cell = row.insertCell();
            if (r === 0) {
            cell.textContent = "Empty";
            continue;
            }
            switch (c) {
            case 0:
                cell.textContent = data[r-1].first_name + " " + data[r-1].last_name
                break;
            case 1:
                cell.textContent = data[r-1].id
                break;
            case 2:
                cell.textContent = data[r-1].class
                break;
            case 3:
                cell.textContent = data[r-1].year_level
                break;
            case 4:
                cell.textContent = data[r-1].username
                break;
            }
        }
    }
    studentTable.rows[0].cells[0].textContent = "Name"
    studentTable.rows[0].cells[1].textContent = "ID"
    studentTable.rows[0].cells[2].textContent = "PC"
    studentTable.rows[0].cells[3].textContent = "year"
    studentTable.rows[0].cells[4].textContent = "username"
}

async function doStudentSearch() {
    const q = document.getElementById('studentSearchBox').value;
    const resp = await apiFetch(`/api/students/search?q=${encodeURIComponent(q)}`);
    const data = await resp.json();
    console.log(data)

    displayStudentData(data)

    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

function displayTimetableData(data) {
    let timetableTable = document.getElementById("timetableTable");
    timetableTable.innerHTML = ""; 
    classes = data["classes"]
    for (let r = 0; r < classes.length+1; r++) {
        let row = timetableTable.insertRow();

        for (let c = 0; c < 8; c++) {
            let cell = row.insertCell();
            if (r === 0) {
            cell.textContent = "Empty";
            continue;
            }
            switch (c) {
            case 0:
                cell.textContent = classes[r-1].period_info.period_name
                break;
            case 1:
                const start_time_obj = new Date(classes[r-1].period_info.start_time)
                cell.textContent = timeFormatter.format(start_time_obj)
                break;
            case 2:
                const end_time_obj = new Date(classes[r-1].period_info.end_time)
                cell.textContent = timeFormatter.format(end_time_obj)
                break;
            case 3:
                cell.textContent = classes[r-1].classroom_info.phone
                break;
            case 4:
                cell.textContent = classes[r-1].classroom_info.location
                break;
            case 5:
                cell.textContent = classes[r-1].teacher_name
                break;
            case 6:
                cell.textContent = classes[r-1].class_code
                break;
            case 7:
                cell.textContent = classes[r-1].class_name
                break;
            }
        }
    }
    timetableTable.rows[0].cells[0].textContent = "Period"
    timetableTable.rows[0].cells[1].textContent = "Start Time"
    timetableTable.rows[0].cells[2].textContent = "End Time"
    timetableTable.rows[0].cells[3].textContent = "Phone Number"
    timetableTable.rows[0].cells[4].textContent = "Location"
    timetableTable.rows[0].cells[5].textContent = "Teacher Name"
    timetableTable.rows[0].cells[6].textContent = "Class Code"
    timetableTable.rows[0].cells[7].textContent = "Class Name"

    document.getElementById('rawAlternateActivities').textContent = JSON.stringify(data["alternate_activities"], null, 2);
}

async function updatePeriodTable(periodData, studentId) {
    let periodTable = document.getElementById("periodTable");

    const studentInfo = await getStudentById(studentId)

    periodRow = periodTable.rows[1]
    periodRow.cells[0].textContent = studentInfo.first_name + " " + studentInfo.last_name
    periodRow.cells[1].textContent = periodData.classroom_info.phone
    periodRow.cells[2].textContent = periodData.classroom_info.location
    periodRow.cells[3].textContent = studentInfo.year_level
    periodRow.cells[4].textContent = periodData.class_name
    periodRow.cells[5].textContent = periodData.teacher_name
}

function displayPeriodData(data, studentId) {   
    const periodSelection = document.getElementById("periodSelection");
    periodSelection.length = 0; //delete all current options
    const nowTime = new Date()
    let currentPeriodData = false 
    let indexCount = 0
    data["classes"].forEach(periodData => {
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
            currentPeriodData = periodData
            periodSelection.value = indexCount
        } else if (nowMs > startMs) {
            currentPeriodData = periodData
            periodSelection.value = indexCount
        }
        indexCount++
    });
    if (currentPeriodData) {
        updatePeriodTable(currentPeriodData, studentId)
    } else {
        console.log("wthelly!?!")
    }

    let alternateActivities = document.getElementById("alternateActivities");
    let alternateActivitiesString = ""
    data["alternate_activities"].forEach(activity => {
        alternateActivitiesString += activity["activity_info"] + "\n" + activity["activity_teacher"] + "\n\n"
    });
    if (alternateActivities == "") {
        alternateActivities.textContent = "No Alternate Activites"
        alternateActivities.style.color = "black"
    }

    document.getElementById('alternateActivities').textContent = alternateActivitiesString.slice(0,-2);
    alternateActivities.style.color = "red"
}

async function doTimetableSearch() {
    const q = document.getElementById('timetableSearchBox').value;
    const resp = await apiFetch(`/api/eminerva/timetable/${encodeURIComponent(q)}`);
    const data = await resp.json();
    console.log(data)

    loadedTimetables = {}
    loadedTimetables[q] = data

    displayTimetableData(data)
    displayPeriodData(data, q)

    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

function displayAttendance(data) {
    let attendanceStatus = document.getElementById("attendanceStatus");
    attendanceStatus.textContent = data
    if (data.includes("Presence")) {
    attendanceStatus.style.color = "lime"
    } else {
    attendanceStatus.style.color = "red"
    }
}

async function doAttendanceCheck() {
    const q = document.getElementById('attendanceSearchBox').value;
    const resp = await apiFetch(`/api/eminerva/attendance/${encodeURIComponent(q)}`);
    const data = await resp.json()
    console.log(data)

    displayAttendance(data)

    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}

async function doFullStudentSearch() {
    const q = document.getElementById('fullStudentSearchBox').value;
    const resp = await apiFetch(`/api/eminerva/info/${encodeURIComponent(q)}`);
    const data = await resp.json();
    console.log(data)

    loadedTimetables = {}
    loadedTimetables[q] = data.timetable

    displayAttendance(data.attendance_status)
    displayTimetableData(data.timetable)
    displayPeriodData(data.timetable, q)

    document.getElementById('results').textContent = JSON.stringify(data, null, 2);
}