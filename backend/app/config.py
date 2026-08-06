import os
from dotenv import load_dotenv
import redis
from datetime import timedelta

load_dotenv()

class Config:
    STUDENT_DATA_PATH = os.getenv("STUDENT_DATA_PATH", "data/students.csv")

    SECRET_KEY = os.getenv("SECRET_KEY")

    SESSION_TYPE = "redis"
    SESSION_PERMANENT = True
    PERMANENT_SESSION_LIFETIME = timedelta(7)
    SESSION_USER_SIGNER = True
    SESSION_REDIS = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"