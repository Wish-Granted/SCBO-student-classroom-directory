import time
from functools import wraps
from flask import session, jsonify

from ..eminerva.session_helper import get_eminerva_session

from ..auth.eminerva_client import is_logged_in

EMINERVA_CHECK_TTL_SECONDS = 600

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "eminerva_cookies" not in session:
            return jsonify({"error": "login required"}), 401
        last_checked = session.get("eminerva_last_checked", 0)
        now = time.time()

        if now - last_checked > EMINERVA_CHECK_TTL_SECONDS:
            eminerva_session = get_eminerva_session()
            try:
                if not is_logged_in(eminerva_session):
                    session.clear()
                    return jsonify({"error": "eMinerva session invalid or expired"}), 401
            except Exception:
                return jsonify({"error": "unable to verify eMinerva session"}), 503

            session["eminerva_last_checked"] = now

        return f(*args, **kwargs)
    return wrapper