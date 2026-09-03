from flask import Blueprint, jsonify, request, current_app, session

from ..utils.decorators import login_required

from ..eminerva.session_helper import get_eminerva_session
from ..eminerva.scraper import get_student_timetable, get_student_current_attendance, EminervaSessionExpired, attempt_twice

lists_bp = Blueprint("lists", __name__, url_prefix="/api/lists")

def _merge_items_with_students(list_id):
    repo = current_app.list_repository
    student_repo = current_app.student_repository
    merged = []
    for item in repo.get_list_items(list_id):
        student = student_repo.get_by_id(item["student_id"])
        if not student:
            continue
        merged.append({**student, **item})

    return merged

@lists_bp.route("", methods = ["GET"])
@login_required
def get_lists():
    return jsonify(current_app.list_repository.get_all_lists())

@lists_bp.route("", methods = ["POST"])
@login_required
def create_list():
    data = request.get_json(silent=True) or {}

    name = data.get("name")
    if not name:
        return jsonify({"error": "name required"}), 400

    new_list = current_app.list_repository.create_list(name, data.get("description", ""))

    return jsonify(new_list, 201)

@lists_bp.route("/<int:list_id>", methods = ["GET"])
@login_required
def get_list_detail(list_id):
    repo = current_app.list_repository
    the_list = repo.get_list(list_id)
    if not the_list:
        return jsonify({"error": "not found"}), 404

    return jsonify({**the_list, "students": _merge_items_with_students(list_id)})

@lists_bp.route("/<int:list_id>", methods=["PUT"])
@login_required
def update_list(list_id):
    data = request.get_json(silent=True) or {}
    updated = current_app.list_repository.update_list(list_id, data.get("name"), data.get("description"))
    if not updated:
        return jsonify({"error": "not found"}), 404
    return jsonify(updated)

@lists_bp.route("/<int:list_id>", methods=["DELETE"])
@login_required
def delete_list(list_id):
    if not current_app.list_repository.delete_list(list_id):
        return jsonify({"error": "not found"}), 404
    return jsonify({"message": "deleted"})

@lists_bp.route("/<int:list_id>/info", methods=["GET"])
@login_required
def get_list_info(list_id):
    repo = current_app.list_repository
    the_list = repo.get_list(list_id)
    if not the_list:
        return jsonify({"error": "not found"}), 404

    eminerva_session = get_eminerva_session()
    if not eminerva_session:
        return jsonify({"error": "login required"}), 401

    students = _merge_items_with_students(list_id)
    results = []
    for student in students:
        student_id = student["student_id"]
        try:
            timetable = attempt_twice(
                lambda sid=student_id: get_student_timetable(eminerva_session, sid),
                f"Retried fetching timetable for {student_id}"
            )
            attendance_status = attempt_twice(
                lambda sid=student_id: get_student_current_attendance(eminerva_session, sid),
                f"Retried fetching attendance for {student_id}"
            )
        except EminervaSessionExpired:
            session.pop("eminerva_cookies", None)
            return jsonify({"error": "eMinerva session expired, please log in again"}), 401
        except ValueError:
            timetable, attendance_status = None, None
            print(f"Failed fetching info for {student_id}, skipping")

        results.append({**student, "timetable": timetable, "attendance_status": attendance_status})

    return jsonify(results)

@lists_bp.route("/<int:list_id>/students", methods=["POST"])
@login_required
def add_students(list_id):
    data = request.get_json(silent=True) or {}
    student_ids = data.get("student_ids")
    if not student_ids:
        return jsonify({"error": "student_ids required"}), 400
    if not current_app.list_repository.get_list(list_id):
        return jsonify({"error": "list not found"}), 404
    current_app.list_repository.add_students(list_id, student_ids)
    return jsonify(_merge_items_with_students(list_id)), 201

@lists_bp.route("/<int:list_id>/students/<student_id>", methods=["DELETE"])
@login_required
def remove_student(list_id, student_id):
    if not current_app.list_repository.remove_student(list_id, student_id):
        return jsonify({"error": "not found"}), 404
    return jsonify({"message": "removed"})

@lists_bp.route("/<int:list_id>/students/<student_id>/called", methods=["PATCH"])
@login_required
def set_called(list_id, student_id):
    data = request.get_json(silent=True) or {}
    called = bool(data.get("called", True))
    result = current_app.list_repository.set_called(list_id, student_id, called)
    if not result:
        return jsonify({"error": "not found"}), 404
    return jsonify(result)