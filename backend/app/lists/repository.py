from abc import ABC, abstractmethod

class ListRepository(ABC):
    @abstractmethod
    def create_list(name, description) -> dict:
        """Insert a new (empty) list and return the full row that was created, including its generated id and created_at."""
        raise NotImplementedError
    
    @abstractmethod
    def get_all_lists() -> list[dict]:
        """Return every list's metadata (id, name, description, created_at)"""
        raise NotImplementedError

    @abstractmethod
    def get_list(list_id) -> dict | None:
        """Return one list's metadata by id, or None if it doesn't exist."""
        raise NotImplementedError

    @abstractmethod
    def update_list(list_id, name=None, description=None) -> dict | None:
        """Update whichever fields are provided (leave others unchanged), return the updated row, or None if the list doesn't exist."""
        raise NotImplementedError
    
    @abstractmethod
    def delete_list(list_id) -> bool:
        """	Delete a list and everything in it. Return whether a row was actually deleted."""
        raise NotImplementedError
    
    @abstractmethod
    def add_students(list_id, student_ids) -> list[dict]:
        """Insert one or more (list_id, student_id) rows into list_items, ignoring duplicates. Return the list's items after inserting."""
        raise NotImplementedError
    
    @abstractmethod
    def remove_student(list_id, student_id) -> bool:
        """Delete one student from one list. Return whether a row was actually deleted."""
        raise NotImplementedError
    
    @abstractmethod
    def get_list_items(list_id) -> list[dict]:
        """Return the raw membership rows for a list (student_id, called, called_at, added_at)"""
        raise NotImplementedError
    
    @abstractmethod
    def set_called(list_id, student_id, called) -> dict | None:
        """Flip the called flag for one student in one list, stamp/clear called_at accordingly, return the updated row or None if that student isn't in that list"""
        raise NotImplementedError
