from flask import Blueprint, jsonify, request, current_app

from ..utils.decorators import login_required

students_bp = Blueprint("students", __name__, url_prefix="/api/students")

@students_bp.route("/search", methods=["GET"])
@login_required
def search():
    query = request.args.get('q', '')
    repo = current_app.student_repository
    results = repo.search(query)
    return jsonify(results)

@students_bp.route("/<student_id>", methods=["GET"])
@login_required
def get_student(student_id):
    repo = current_app.student_repository
    student = repo.get_by_id(student_id)
    if not student:
        return jsonify({"error": "not found"}), 404
    return jsonify(student)