from flask import Blueprint, jsonify, session, current_app

from app.utils.decorators import login_required
from .session_helper import get_eminerva_session
from .scraper import get_student_timetable, EminervaSessionExpired, get_student_current_attendance

eminerva_bp = Blueprint("eminerva", __name__, url_prefix="/api/eminerva")

def attempt_twice(func, retry_message:str):
    MAX_ATTEMPTS = 2
    attemps = 0
    while attemps < MAX_ATTEMPTS:
        try:
            data = func()
        except ValueError as e:
            if attemps > 0:
                raise e
            attemps += 1
            print(retry_message)
            continue
        except EminervaSessionExpired:
            session.pop("eminerva_cookies", None)
            return jsonify({"error": "eMinerva session expired, please log in again"}), 401
        break
    return data

@eminerva_bp.route("/timetable/<student_id>", methods=["GET"])
@login_required
def timetable(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    timetable = attempt_twice(lambda: get_student_timetable(eminerva_session, student_id), "Retried fetching student timetable")

    return jsonify(timetable)

@eminerva_bp.route("/attendance/<student_id>", methods=["GET"])
@login_required
def attendance(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    attendance_status = attempt_twice(lambda: get_student_current_attendance(eminerva_session, student_id), "Retried fetching student attendance")

    return jsonify(attendance_status)

@eminerva_bp.route("/info/<student_id>", methods=["GET"])
@login_required
def info(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    timetable = attempt_twice(lambda: get_student_timetable(eminerva_session, student_id), "Retried fetching student timetable")
    attendance_status = attempt_twice(lambda: get_student_current_attendance(eminerva_session, student_id), "Retried fetching student attendance")
    data = {
        "student_id": student_id,
        "attendance_status": attendance_status,
        "timetable": timetable,
    }
    return jsonify(data)