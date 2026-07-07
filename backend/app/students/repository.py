from abc import ABC, abstractmethod

class StudentRepository(ABC):
    @abstractmethod
    def search(self, query: str) -> list[dict]:
        """Return a list of student dicts matching the query."""
        raise NotImplementedError
    
    @abstractmethod
    def get_by_id(self, student_id) -> dict | None:
        """Return a single student dict, or None if not found."""
        raise NotImplementedError