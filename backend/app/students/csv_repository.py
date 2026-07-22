import csv
from pathlib import Path

from .repository import StudentRepository

class CSVStudentRepository(StudentRepository):
    def __init__(self, csv_path):
        self.csv_path = Path(csv_path)
        self._students = self._load()

    def _load(self) -> list:
        with open(self.csv_path, "r", encoding='utf-8') as file:
            reader = csv.DictReader(file)
            return list(reader)

    def search(self, query: str) -> list[dict]:
        query = query.lower().strip()
        if not query:
            return self._students
        
        return [s for s in self._students
                if query in s["first_name"].lower()
                or query in s["last_name"].lower()
                or query in s["first_name"].lower() + " " + s["last_name"].lower()
                or query in s["id"].lower()
                or query in s["username"].lower()
                or query in s["class"].lower()
                or query in s["year_level"].lower()]

    def get_by_id(self, student_id: str) -> dict | None:
        if student_id[0] != "s":
            student_id = "s" + student_id
        for student in self._students:
            if student["id"] == student_id:
                return student
        return None