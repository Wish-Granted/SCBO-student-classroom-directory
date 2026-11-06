import os
import tempfile
import threading
from pathlib import Path

MAX_NOTES_LENGTH = 10_000

class TXTNotes:
    def __init__(self, notes_path):
        self.notes_path = Path(notes_path)
        self._lock = threading.Lock()
        self.notes_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.notes_path.exists():
            self.notes_path.write_text("", encoding="utf-8")

    def get(self) -> str:
        # read from disk each time so multiple workers always see the latest note
        with self._lock:
            try:
                return self.notes_path.read_text(encoding="utf-8")
            except FileNotFoundError:
                return ""

    def save(self, notes: str) -> None:
        with self._lock:
            # write to a temp file then swap it in, so a crashes wont leave half written notes
            fd, tmp_path = tempfile.mkstemp(dir=self.notes_path.parent, suffix=".tmp")
            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(notes)
                os.replace(tmp_path, self.notes_path)
            except Exception:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
                raise