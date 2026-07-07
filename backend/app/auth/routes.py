from flask import Blueprint, jsonify, request, session

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username")

    if not username:
        return jsonify({"error": "username required"}), 400

    session["user"] = username

    return jsonify({"message": f"logged in as {username}"}), 200

@auth_bp.route("/whoami", methods=["GET"])
def login():
    user = session.get("user")
    if not user:
        return jsonify({"error": "not logged in"}), 401
    return jsonify({"user":user})