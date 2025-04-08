import psycopg
import os
import uuid
import time

from typing import Optional, Union, Dict


class PostgreSQLClient:
    def __init__(self, **kwargs) -> None:
        self.connection_string = os.getenv("POSTGRES_CONNECTION_STRING")

        self.conn_params = kwargs
        self.connection = None

    # Uuid as the primary key for each row on each table
    def generate_uuid(self) -> str:
        return str(uuid.uuid4())

    # Returns true if connection succeed and false otherwise
    def connect(self) -> bool:
        try:
            if self.connection_string:
                self.connection = psycopg.connect(self.connection_string)
            else:
                self.connection = psycopg.connect(**self.conn_params)

            print("Successfully connected to PostgreSQL database")
            return True

        except Exception as e:
            print(f"Failed to connect to PostgreSQL database: {e}")

            return False

    def disconnect(self) -> None:
        if self.connection:
            self.connection.close()
            self.connection = None
            print("Disconnected from PostgreSQL database")

    # Execute raw_sql query
    def execute_query(self, sql: str, params: Optional[Union[tuple, dict]] = None):
        if not self.connection:
            if not self.connect():
                raise ConnectionError("Not connected to database")

        try:
            with self.connection.cursor(row_factory=psycopg.rows.dict_row) as cur:
                cur.execute(sql, params)
                self.connection.commit()

                if cur.description:  # Check if the query returns data (SELECT)
                    return cur.fetchall()

                if (
                    cur.rowcount > -1
                ):  # Check if the query affected rows (INSERT/UPDATE/DELETE)
                    return cur.rowcount

                return None

        except Exception as e:
            print(f"SQL execution failed: {e}")

            self.connection.rollback()
            raise e

    def create_tables(self):
        try:
            self.connect()

            self.execute_query(
                """
                CREATE TABLE IF NOT EXISTS executable (
                    id TEXT PRIMARY KEY,
                    code TEXT NOT NULL,
                    user_id TEXT NOT NULL
                )
                """
            )

            # Foreign key links to a executable row
            self.execute_query(
                """
                CREATE TABLE IF NOT EXISTS output_code (
                    id TEXT PRIMARY KEY,
                    executable_id TEXT NOT NULL,
                    output TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    FOREIGN KEY (executable_id) REFERENCES executable (id)
                )
                """
            )
            print("Successfully created both tables")

        except Exception as e:
            print(f"Table creation has failed with error: {e}")
            raise e

        finally:
            self.disconnect()

    def add_code_with_output(
        self, code: str, output: str, userId: str
    ) -> Optional[Dict[str, str]]:
        try:
            self.connect()
            # Generate UUIDs for new records
            executable_id = self.generate_uuid()
            output_id = self.generate_uuid()

            self.execute_query(
                "INSERT INTO executable (id, code, user_id) VALUES (%s, %s, %s)",
                (executable_id, code, userId),
            )

            self.execute_query(
                "INSERT INTO output_code (id, executable_id, output, timestamp) VALUES (%s, %s, %s, %s)",
                (output_id, executable_id, output, time.time()),
            )

            print("Successfully added code and output into SQL table")

            return {"executable_id": executable_id, "output_id": output_id}

        except Exception as e:
            print(f"Error adding code with output: {e}")
            raise e

        finally:
            self.disconnect()


PostgreSQLInstance = PostgreSQLClient()
