from flask import Blueprint, jsonify, request, current_app

import os #TEMP

students_bp = Blueprint("students", __name__, url_prefix="/api/students")

visit_count = 0

@students_bp.route("/search", methods=["GET"])
def search():
    query = request.args.get('q', '')
    repo = current_app.student_repository
    results = repo.search(query)
    return jsonify(results)

@students_bp.route("/<student_id>", methods=["GET"])
def get_student(student_id):
    repo = current_app.student_repository
    student = repo.get_by_id(student_id)
    if not student:
        return jsonify({"error": "not found"}), 404
    return jsonify(student)

#TEMP
@students_bp.route("/../debug/visit", methods=["GET"])
def debug_visit():
    global visit_count
    visit_count += 1
    return jsonify({"visit_count": visit_count, "pid": os.getpid()})