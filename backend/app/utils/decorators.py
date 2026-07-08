from functools import wraps
from flask import session, jsonify

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if "eminerva_cookies" not in session:
            return jsonify({"error": "login required"}), 401
        return f(*args, **kwargs)
    return wrapper