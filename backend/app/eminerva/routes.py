from flask import Blueprint, jsonify, session, current_app

from app.utils.decorators import login_required
from .session_helper import get_eminerva_session
from .scraper import get_student_timetable, EminervaSessionExpired, get_student_current_attendance

eminerva_bp = Blueprint("eminerva", __name__, url_prefix="/api/eminerva")

@eminerva_bp.route("/timetable/<student_id>", methods=["GET"])
@login_required
def timetable(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    attemps = 0
    while attemps < 2:
        try:
            data = get_student_timetable(eminerva_session, student_id)
        except ValueError as e:
            if attemps > 0:
                raise e
            attemps += 1
            print("Retried fetching student timetable")
            continue
        except EminervaSessionExpired:
            session.pop("eminerva_cookies", None)
            return jsonify({"error": "eMinerva session expired, please log in again"}), 401
        break
    return jsonify(data)

@eminerva_bp.route("/attendance/<student_id>", methods=["GET"])
@login_required
def attendance(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    attemps = 0
    while attemps < 2:
        try:
            data = get_student_current_attendance(eminerva_session, student_id)
        except ValueError as e:
            if attemps > 0:
                raise e
            attemps += 1
            print("Retried fetching student attendance")
            continue
        except EminervaSessionExpired:
            session.pop("eminerva_cookies", None)
            return jsonify({"error": "eMinerva session expired, please log in again"}), 401
        break
    return jsonify(data)

@eminerva_bp.route("/info/<student_id>", methods=["GET"])
@login_required
def info(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    try:
        timetable = get_student_timetable(eminerva_session, student_id)
        attendance_status = get_student_current_attendance(eminerva_session, student_id)
        data = {
            "student_id": student_id,
            "attendance_status": attendance_status,
            "timetable": timetable,
        }
    except EminervaSessionExpired:
        session.pop("eminerva_cookies", None)
        return jsonify({"error": "eMinerva session expired, please log in again"}), 401
    return jsonify(data)