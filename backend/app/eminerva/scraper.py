from bs4 import BeautifulSoup
import requests
import datetime

from .parse_timetable import get_today_classes

class EminervaSessionExpired(Exception):
    pass

STUDENT_TIMETABLE_URL = "https://eminerva.bne.catholic.edu.au/eMinerva/Dialogs/TimetableDialog.aspx"

def get_student_timetable(eminerva_session: requests.Session, student_id: str) -> dict:
    resp = eminerva_session.get(STUDENT_TIMETABLE_URL, allow_redirects=True, timeout=10, params={"studentID": student_id})
    print("Url Checked: ", resp.url.lower())
    if "login" in resp.url.lower() or "primary" in resp.url.lower():
        raise EminervaSessionExpired()

    soup = BeautifulSoup(resp.text, "html.parser")

    """
    HOLIDAY TESTING IN HOLIDAYS DELETE ME LATER
    """
    resp = test(soup, STUDENT_TIMETABLE_URL, {"studentID": student_id}, eminerva_session)
    soup = BeautifulSoup(resp.text, "html.parser")
    """
    ---------------------------------
    """

    today_name = datetime.datetime.now().strftime("%A")  # e.g. "Tuesday"
    classes = get_today_classes(soup, weekday=today_name)
    
    return classes


#REMOVE, USE FOR HOLIDAY TESTING TODO
def test(soup, url, params, session):
    def get_hidden_fields(soup):
        fields = {}
        for inp in soup.find_all("input", type="hidden"):
            name = inp.get("name")
            if name:
                fields[name] = inp.get("value", "")
        return fields

    form_data = get_hidden_fields(soup)

    # Step 2: override target for prev week
    form_data["__EVENTTARGET"] = "StudentDialogTimetable1$nextWeekLink"
    form_data["__EVENTARGUMENT"] = ""

    # Step 3: POST back to the same URL
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",  # often needed for ASP.NET AJAX postbacks
    }

    resp2 = session.post(url, params=params, data=form_data, headers=headers)
    return resp2
