import json
import secrets

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, session

from .eminerva_client import build_session, is_logged_in, serialize_cookies

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
web_auth_bp = Blueprint("web_auth", __name__)

TARGET_NAMES = {"MRHSession", "ASP.NET_SessionId"}
HANDOFF_TTL = 60  # seconds a handoff token stays valid

def store_login(cookies: list[dict], username: str):
    session.permanent = True
    session["eminerva_cookies"] = [c for c in cookies if c["name"] in TARGET_NAMES]
    session["user"] = username

@auth_bp.route("/eminerva-session", methods=["POST"])
def create_eminerva_session():
    data = request.get_json(silent=True) or {}
    cookies = data.get("cookies")
    username: str = data.get("username")
    
    if not cookies:
        return jsonify({"error": "cookies required"}), 400

    if not username:
        return jsonify({"error": "username not found"}), 400
    if "@" in username:
        username = username[:username.index("@")]
    _, username = username.split("\\")
    print(username)

    eminerva_session = build_session(cookies)

    if not is_logged_in(eminerva_session):
        return jsonify({"error": "eMinerva session invalid or expired"}), 401
    
    session.permanent = True
    target_names = {"MRHSession", "ASP.NET_SessionId"}
    serialized = serialize_cookies(eminerva_session)
    session["eminerva_cookies"] = [c for c in serialized if c["name"] in target_names]
    session["user"] = username

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

@web_auth_bp.route("/login")
def login_page():
    return render_template("login.html")

@auth_bp.route("/extension-handoff", methods=["POST"])
def extension_handoff():
    data = request.get_json(silent=True) or {}
    cookies = data.get("cookies")
    username = data.get("username")

    if not cookies or not username:
        return jsonify({"error": "cookies and username required"}), 400

    eminerva_session = build_session(cookies)
    if not is_logged_in(eminerva_session):
        return jsonify({"error": "eMinerva session invalid or expired"}), 401

    token = secrets.token_urlsafe(32)
    payload = {
        "cookies": [c for c in serialize_cookies(eminerva_session) if c["name"] in TARGET_NAMES],
        "user": username,
    }
    current_app.config["SESSION_REDIS"].setex(f"handoff:{token}", HANDOFF_TTL, json.dumps(payload))
    return jsonify({"token": token})

@auth_bp.route("/claim", methods=["GET"])
def claim():
    token = request.args.get("token", "")
    key = f"handoff:{token}"

    # read + delete in one transaction so a token can only be used once
    pipe = current_app.config["SESSION_REDIS"].pipeline()
    pipe.get(key)
    pipe.delete(key)
    raw, _ = pipe.execute()

    if not raw:
        return "This link has expired. Click Connect in the extension again.", 400

    payload = json.loads(raw)
    session.clear()
    store_login(payload["cookies"], payload["user"])
    return redirect("/")