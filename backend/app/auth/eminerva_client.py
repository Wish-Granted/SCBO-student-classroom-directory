import requests

EMINERVA_CHECK_URL = "https://eminerva.bne.catholic.edu.au/eMinerva"
LOGIN_MARKER = "id=\"loginForm\""

def build_session(cookies: list[dict]) -> requests.Session:
    s = requests.Session()

    for c in cookies:
        s.cookies.set(c["name"], c["value"], domain=c.get("domain"), path=c.get("path", "/"))

    return s

def is_logged_in(requests_session: requests.Session, check_url: str = EMINERVA_CHECK_URL) -> bool:
    resp = requests_session.get(check_url, allow_redirects=True, timeout=10)
    if "bne.catholic.edu.au" in resp.url.lower():
        return False
    if LOGIN_MARKER in resp.text:
        return False
    return True

def serialize_cookies(requests_session: requests.Session) -> list[dict]:
    return [
        {"name": c.name, "value": c.value, "domain": c.domain, "path": c.path}
        for c in requests_session.cookies
    ]