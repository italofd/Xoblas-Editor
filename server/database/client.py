import sqlite3
import uuid

from typing import List, Dict, Optional, Tuple


# Basic SQL-Lite client, first option due to already implemented inside std python
# This will most probably be refactor in favor of something hosted outside of the server itself
# DEPRECATED: Use the PostgreSQL client
class SQLiteClient:
    def __init__(self, db_path: str = "aq-take-home.db"):
        self.db_path = db_path
        self.connection = None
        self.cursor = None

        # Connect to database
        self.connect()

        # Create tables if they don't exist
        self.create_tables()

    def connect(self) -> bool:

        try:
            self.connection = sqlite3.connect(self.db_path)
            self.connection.row_factory = sqlite3.Row
            self.cursor = self.connection.cursor()

            return True

        except sqlite3.Error as e:
            print(f"Connection error: {e}")
            return False

    def disconnect(self):
        if self.connection:
            self.connection.close()
            self.connection = None
            self.cursor = None

    def create_tables(self):
        self.execute_query(
            """
        CREATE TABLE IF NOT EXISTS executable (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL
        )
        """
        )

        # Foreign key links to a executable row
        self.execute_query(
            """
        CREATE TABLE IF NOT EXISTS output_code (
            id TEXT PRIMARY KEY,
            executable_id TEXT NOT NULL,
            output TEXT,
            FOREIGN KEY (executable_id) REFERENCES executable (id)
        )
        """
        )

    def execute_query(self, query: str, params: Tuple = ()) -> Optional[List]:
        if not self.connection:
            if not self.connect():
                return None

        try:
            self.cursor.execute(query, params)

            if query.strip().upper().startswith(("SELECT", "PRAGMA")):
                return [dict(row) for row in self.cursor.fetchall()]

            else:
                self.connection.commit()
                return []

        except sqlite3.Error as e:
            print(f"Query execution error: {e}")
            return None

    # Uuid as the primary key for each row on each table
    def generate_uuid(self) -> str:
        return str(uuid.uuid4())

    def add_code_with_output(self, code: str, output: str) -> Optional[Dict[str, str]]:
        try:
            # Generate UUIDs for new records
            executable_id = self.generate_uuid()
            output_id = self.generate_uuid()

            self.execute_query(
                "INSERT INTO executable (id, code) VALUES (?, ?)", (executable_id, code)
            )

            self.execute_query(
                "INSERT INTO output_code (id, executable_id, output) VALUES (?, ?, ?)",
                (output_id, executable_id, output),
            )

            return {"executable_id": executable_id, "output_id": output_id}

        except Exception as e:
            print(f"Error adding code with output: {e}")
            return None
