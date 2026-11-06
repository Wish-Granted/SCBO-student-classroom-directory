from flask import Blueprint, jsonify, request, current_app

from ..utils.decorators import login_required
from .txt_notes import MAX_NOTES_LENGTH

notes_bp = Blueprint("notes", __name__, url_prefix="/api/notes")

@notes_bp.route("/", methods=["GET"])
@login_required
def get_notes():
    return jsonify({"notes": current_app.notes.get()})

@notes_bp.route("/", methods=["PUT"])
@login_required
def save_notes():
    data = request.get_json(silent=True) or {}
    notes = data.get("notes")

    if not isinstance(notes, str):
        return jsonify({"error": "notes must be a string"}), 400
    if len(notes) > MAX_NOTES_LENGTH:
        return jsonify({"error": "notes too long"}), 413

    current_app.notes.save(notes)
    return jsonify({"notes_saved": True})