import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    STUDENT_DATA_PATH = os.getenv("STUDENT_DATA_PATH", "data/students.csv")