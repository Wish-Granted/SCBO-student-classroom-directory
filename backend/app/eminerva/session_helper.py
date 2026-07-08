from flask import session, jsonify
import requests

from ..auth.eminerva_client import build_session

def get_eminerva_session() -> requests.Session | None:
    eminerva_cookies = session.get("eminerva_cookies")
    
    if not eminerva_cookies:
        return None
    
    return build_session(eminerva_cookies)
