import sqlite3
from pathlib import Path

from .repository import ListRepository

SCHEMA = """
CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    called INTEGER NOT NULL DEFAULT 0,
    called_at TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(list_id, student_id)
);
"""

class SQLiteRepository(ListRepository):
    def __init__(self, db_path: str):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._connect() as conn:
            conn.executescript(SCHEMA)

    def create_list(self, name: str, description: str = "") -> dict:
        with self._connect() as conn:
            cur = conn.execute("INSERT INTO lists (name, description) VALUES (?, ?)", (name, description))
        return self.get_list(cur.lastrowid)

    def get_all_lists(self) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM lists ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]

    def get_list(self, list_id: int) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM lists WHERE id = ?", (str(list_id))).fetchone()
            return dict(row) if row else None

    def update_list(self, list_id: int, name: str = None, description: str =None) -> dict | None:
        current = self.get_list(list_id)
        if not current:
            return None
        name = name if name is not None else current[name]
        description = description if description is not None else current[description]

        with self._connect() as conn:
            conn.execute("UPDATE lists SET name = ?, description = ? WHERE id = ?", (name, description, str(list_id)))

        return self.get_list(list_id)

    def delete_list(self, list_id: int):
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM lists WHERE id = ?", (str(list_id)))
            return cur.rowcount > 0

    def add_students(self, list_id: int, student_ids: list[str]) -> list[dict]:
        with self._connect() as conn:
            conn.executemany("INSERT OR IGNORE INTO list_items (list_id, student_id) VALUES (?, ?)", [(str(list_id), sid) for sid in student_ids])

        return self.get_list_items(list_id)

    def remove_student(self, list_id: int, student_id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM list_items WHERE list_id = ? AND student_id = ?",(str(list_id), student_id))
            return cur.rowcount > 0

    def get_list_items(self, list_id: int) -> list[dict]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM list_items WHERE list_id = ? ORDER BY added_at", (str(list_id))).fetchall()
            return [dict(r) for r in rows]

    def set_called(self, list_id: int, student_id: str, called: bool) -> dict | None:
        with self._connect() as conn:
            conn.execute("""UPDATE list_items 
                            SET called = ?, called_at = CASE WHEN ? THEN datetime('now') ELSE NULL END
                            WHERE list_id = ? AND student_id = ?""", 
                            (int(called), int(called), list_id, student_id)
            )
            row = conn.execute("SELECT * FROM list_items WHERE list_id = ? AND student_id = ?", (str(list_id), student_id)).fetchone()
            return dict(row) if row else None