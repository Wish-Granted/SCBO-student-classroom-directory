"""
Made by claude
Parses the eMinerva "Timetable" response.txt and extracts a single day's
classes (Pastoral Care -> Period 5), skipping First Break / Second Break.

Usage:
    from parse_timetable import get_today_classes
    classes = get_today_classes(html_text, weekday="Tuesday")
"""

from bs4 import BeautifulSoup


def parse_classroom_info(raw):
    """
    'Studio 4: 124' -> {'raw': 'Studio 4: 124', 'location': 'Studio 4', 'phone': '124'}
    Handles cases with no colon gracefully.
    """
    raw = (raw or "").strip()
    if ":" in raw:
        location, phone = raw.rsplit(":", 1)
        return {
            "raw": raw,
            "location": location.strip(),
            "phone": phone.strip(),
        }
    return {"raw": raw, "location": raw, "phone": ""}


def get_today_classes(soup: BeautifulSoup, weekday="Monday"):
    """
    weekday: one of Monday, Tuesday, Wednesday, Thursday, Friday
    Returns a list of dicts, one per period (Pastoral Care..Period 5),
    skipping any row whose period label contains "Break".
    """
    table = soup.find("table", id="StudentDialogTimetable1_dpcTimeTable")
    if table is None:
        raise ValueError("Could not find timetable table in response.txt")

    inner_table = table.find("table")
    # IMPORTANT: recursive=False, otherwise this also grabs every <tr> inside
    # the nested per-class tables in each day cell (causing way more "rows"
    # than the actual 9 period rows, and breaking all the indexing below).
    rows = inner_table.find_all("tr", recursive=False)

    # First row = header with day names. Find which column index matches weekday.
    header_cells = rows[0].find_all("td", recursive=False)
    day_index = None
    for i, cell in enumerate(header_cells):
        if weekday.lower() in cell.get_text(strip=True).lower():
            day_index = i
            break
    if day_index is None:
        raise ValueError(f"Could not find weekday column for '{weekday}'")

    results = []

    for row in rows[1:]:
        cells = row.find_all("td", recursive=False)
        if not cells or day_index >= len(cells):
            continue

        # First cell of the row = period label, e.g. "8:45 AM - 9:45 AM \n Period 1"
        period_label_cell = cells[0]
        period_text = period_label_cell.get_text(" ", strip=True)

        if "break" in period_text.lower() or "activity" in period_text.lower():
            continue  # skip First/Second Break and the empty "Activity" row

        day_cell = cells[day_index]
        inner_tables = day_cell.find_all("table")
        if not inner_tables:
            continue

        # The class info is always in the LAST inner table of the cell
        # (some cells have an extra small table showing a time override first).
        info_table = inner_tables[-1]
        info_rows = info_table.find_all("tr", recursive=False)

        if not info_rows:
            continue

        cell_texts = [r.get_text(strip=True) for r in info_rows]
        if not cell_texts or not cell_texts[0]:
            continue  # empty cell, no class this period

        class_code = cell_texts[0]

        # Normal classes have a bold subject-name row (e.g. "Mathematics").
        # Home Group / Pastoral Care rows skip straight to teacher + room
        # (only 3 rows total instead of 4), so detect via the <b> tag rather
        # than assuming a fixed row count/order.
        has_name_row = info_rows[1].find("b") is not None if len(info_rows) > 1 else False

        if has_name_row:
            class_name = cell_texts[1]
            teacher_name = cell_texts[2] if len(cell_texts) > 2 else ""
            classroom_raw = cell_texts[3] if len(cell_texts) > 3 else ""
        else:
            class_name = class_code
            teacher_name = cell_texts[1] if len(cell_texts) > 1 else ""
            classroom_raw = cell_texts[2] if len(cell_texts) > 2 else ""

        results.append({
            "period": period_text,
            "class_code": class_code,
            "class_name": class_name,
            "teacher_name": teacher_name,
            "classroom_info": parse_classroom_info(classroom_raw),
        })

    return results


def get_attendance_from_soup(soup: BeautifulSoup):
    table = soup.find("table", {"id": lambda x: x and "gvLocations" in x})
    if table is None:
        raise ValueError("Could not find classes preview table in response.txt")
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        previous_attendance_status = None
        current_attendance_status = None
        if cells and "Previous" in cells[0].text:
            previous_attendance_status = cells[-1].get("title")
        elif cells and "Current" in cells[0].text:
            current_attendance_status = cells[-1].get("title")

    if not current_attendance_status:
        if not previous_attendance_status:
            print("No Attendance Status Found")
            return "N/A"
        print("Used Previous Attendance Status")
        return previous_attendance_status
    else:
        return current_attendance_status

if __name__ == "__main__":
    import sys
    import json

    with open(sys.argv[1] if len(sys.argv) > 1 else "response.txt", encoding="utf-8") as f:
        html = f.read()

    weekday = sys.argv[2] if len(sys.argv) > 2 else "Monday"
    classes = get_today_classes(html, weekday=weekday)
    print(json.dumps(classes, indent=2))