from bs4 import BeautifulSoup
import requests
import datetime

from .parse_data import get_today_classes, get_attendance_from_soup

class EminervaSessionExpired(Exception):
    pass

STUDENT_TIMETABLE_URL = "https://eminerva.bne.catholic.edu.au/eMinerva/Dialogs/TimetableDialog.aspx"
STUDENT_CONTROL_PANEL_URL =  "https://eminerva.bne.catholic.edu.au/eMinerva/Student/Pages/StudentControlPanel.aspx"

def get_student_timetable(eminerva_session: requests.Session, student_id: str) -> dict:
    if student_id[0] == "s":
        student_id = student_id[1:]
    
    resp = eminerva_session.get(STUDENT_TIMETABLE_URL, allow_redirects=True, timeout=10, params={"studentID": student_id})
    print("Url Checked: ", resp.url.lower())
    if "login" in resp.url.lower() or "primary" in resp.url.lower():
        raise EminervaSessionExpired()

    soup = BeautifulSoup(resp.text, "html.parser")

    today_name = datetime.datetime.now().strftime("%A")  # e.g. "Tuesday"
    classes = get_today_classes(soup, weekday=today_name)
    
    return classes

def get_student_current_attendance(eminerva_session: requests.Session, student_id: str) -> dict:
    if student_id[0] == "s":
        student_id = student_id[1:]
    
    resp = eminerva_session.get(STUDENT_CONTROL_PANEL_URL, allow_redirects=True, timeout=10, params={"studentNo": student_id})
    print("Url Checked: ", resp.url.lower())
    if "login" in resp.url.lower() or "primary" in resp.url.lower():
        raise EminervaSessionExpired()

    soup = BeautifulSoup(resp.text, "html.parser")

    attendance_status = get_attendance_from_soup(soup)

    return attendance_status