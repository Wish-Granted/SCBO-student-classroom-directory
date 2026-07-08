from flask import Blueprint, jsonify, session

from app.utils.decorators import login_required
from .session_helper import get_eminerva_session
from .scraper import get_student_timetable, EminervaSessionExpired

eminerva_bp = Blueprint("eminerva", __name__, url_prefix="/api/eminerva")

@eminerva_bp.route("/timetable/<student_id>", methods=["GET"])
@login_required
def timetable(student_id):
    eminerva_session = get_eminerva_session()
    try:
        data = get_student_timetable(eminerva_session, student_id)
    except EminervaSessionExpired:
        session.pop("eminerva_cookies", None)
        return jsonify({"error": "eMinerva session expired, please log in again"}), 401
    
    return jsonify(data)