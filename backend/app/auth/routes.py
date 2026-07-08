from flask import Blueprint, jsonify, request, session

from .eminerva_client import build_session, is_logged_in, serialize_cookies

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/eminerva-session", methods=["POST"])
def create_eminerva_session():
    data = request.get_json(silent=True) or {}
    cookies = data.get("cookies")

    if not cookies:
        return jsonify({"error": "cookies required"}), 400

    eminerva_session = build_session(cookies)

    if not is_logged_in(eminerva_session):
        return jsonify({"error": "eMinerva session invalid or expired"}), 401
    
    session.permanent = True
    session["eminerva_cookies"] = serialize_cookies(eminerva_session)
    session["user"] = "unknown" #TODO SCRAPE USERNAME

    return jsonify({"message": "eMinerva session stored"})

@auth_bp.route("/whoami", methods=["GET"])
def whoami():
    has_eminerva = "eminerva_cookies" in session
    user = session.get("user")

    if not has_eminerva:
        return jsonify({"logged_in": False}), 401

    return jsonify({"logged_in": True, "user": user})

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "logged out"})