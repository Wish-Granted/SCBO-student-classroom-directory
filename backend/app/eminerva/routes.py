from flask import Blueprint, jsonify, session, current_app

from app.utils.decorators import login_required
from .session_helper import get_eminerva_session
from .scraper import attempt_twice, get_student_timetable, EminervaSessionExpired, get_student_current_attendance

eminerva_bp = Blueprint("eminerva", __name__, url_prefix="/api/eminerva")



@eminerva_bp.route("/timetable/<student_id>", methods=["GET"])
@login_required
def timetable(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    try:
        timetable = attempt_twice(lambda: get_student_timetable(eminerva_session, student_id), "Retried fetching student timetable")
    except EminervaSessionExpired:
        session.pop("eminerva_cookies", None)
        return jsonify({"error": "eMinerva session expired, please log in again"}), 401

    return jsonify(timetable)

@eminerva_bp.route("/attendance/<student_id>", methods=["GET"])
@login_required
def attendance(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    try:
        attendance_status = attempt_twice(lambda: get_student_current_attendance(eminerva_session, student_id), "Retried fetching student attendance")
    except EminervaSessionExpired:
        session.pop("eminerva_cookies", None)
        return jsonify({"error": "eMinerva session expired, please log in again"}), 401

    return jsonify(attendance_status)

@eminerva_bp.route("/info/<student_id>", methods=["GET"])
@login_required
def info(student_id):
    eminerva_session = get_eminerva_session()
    if not current_app.student_repository.get_by_id(student_id):
        return jsonify({"error": "student not found"}), 404
    try:
        timetable = attempt_twice(lambda: get_student_timetable(eminerva_session, student_id), "Retried fetching student timetable")
        attendance_status = attempt_twice(lambda: get_student_current_attendance(eminerva_session, student_id), "Retried fetching student attendance")
    except EminervaSessionExpired:
        session.pop("eminerva_cookies", None)
        return jsonify({"error": "eMinerva session expired, please log in again"}), 401

    data = {
        "student_id": student_id,
        "attendance_status": attendance_status,
        "timetable": timetable,
    }
    return jsonify(data)