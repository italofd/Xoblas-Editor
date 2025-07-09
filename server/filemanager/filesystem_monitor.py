#!/usr/bin/env python3
import sys
import json
import time
import os
import base64
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class ContainerFileSystemHandler(FileSystemEventHandler):
    def __init__(
        self, output_file="/tmp/fs_events.jsonl", max_file_size=10 * 1024 * 1024
    ):  # 10MB limit
        self.output_file = output_file
        self.max_file_size = max_file_size
        # Debounce rapid-fire events
        self.recent_events = {}
        self.debounce_time = 0.1  # 100ms debounce

    def _should_ignore_path(self, path):
        """Ignore certain system/temp files based on generic patterns."""
        path_obj = Path(path)

        # Ignore hidden directories (starting with .)
        if any(
            part.startswith(".") and part not in {".", ".."} for part in path_obj.parts
        ):
            return True

        # Ignore common temp/cache patterns
        temp_patterns = {"__pycache__", ".cache", ".tmp", "node_modules"}
        if any(pattern in path_obj.parts for pattern in temp_patterns):
            return True

        # Ignore our own monitoring files
        if path_obj.name in {
            "fs_events.jsonl",
            "filesystem_monitor.py",
            "fs_monitor.log",
        }:
            return True

        return False

    def _get_file_info(self, path):
        """Get basic file information."""
        try:
            stat_info = os.stat(path)
            path_obj = Path(path)

            return {
                "exists": True,
                "is_directory": os.path.isdir(path),
                "is_file": os.path.isfile(path),
                "is_symlink": os.path.islink(path),
                "size": stat_info.st_size,
                "mtime": stat_info.st_mtime,
                "permissions": oct(stat_info.st_mode)[-3:],
                "name": path_obj.name,
            }

        except (OSError, FileNotFoundError):
            return {
                "exists": False,
                "is_directory": False,
                "is_file": False,
                "is_symlink": False,
            }

    def _read_file_content(self, path, file_info):
        """Read file content - try UTF-8 first, fallback to binary."""
        try:
            if not file_info["is_file"] or not file_info["exists"]:
                return None, "not_file"

            if file_info["size"] > self.max_file_size:
                return None, "file_too_large"

            if file_info["size"] == 0:
                return "", "text"

            # Try UTF-8 first
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return f.read(), "text"
            except UnicodeDecodeError:
                # If UTF-8 fails, read as binary
                with open(path, "rb") as f:
                    content = f.read()
                    return base64.b64encode(content).decode("ascii"), "binary"

        except Exception as e:
            print(f"Error reading file {path}: {e}", file=sys.stderr)
            return None, "read_error"

    def _write_event(self, event_type, src_path, dest_path=None):
        """Write event to output file."""
        if self._should_ignore_path(src_path):
            return

        # Debounce events
        event_key = f"{event_type}:{src_path}"
        current_time = time.time()

        if event_key in self.recent_events:
            if current_time - self.recent_events[event_key] < self.debounce_time:
                return

        self.recent_events[event_key] = current_time

        # Get file information
        src_info = self._get_file_info(src_path)

        event_data = {
            "type": "filesystem_change",
            "event_type": event_type,
            "src_path": src_path,
            "is_directory": src_info["is_directory"],
            "timestamp": current_time,
            "file_info": src_info,
        }

        # Add content for files
        if src_info["is_file"] and src_info["exists"]:
            content, content_type = self._read_file_content(src_path, src_info)
            if content is not None:
                event_data["content"] = content
                event_data["content_type"] = content_type

        # Handle destination for move operations
        if dest_path:
            dest_info = self._get_file_info(dest_path)
            event_data["dest_path"] = dest_path
            event_data["dest_is_directory"] = dest_info["is_directory"]
            event_data["dest_file_info"] = dest_info

            # Add content for destination file
            if dest_info["is_file"] and dest_info["exists"]:
                dest_content, dest_content_type = self._read_file_content(
                    dest_path, dest_info
                )
                if dest_content is not None:
                    event_data["dest_content"] = dest_content
                    event_data["dest_content_type"] = dest_content_type

        try:
            with open(self.output_file, "a") as f:
                f.write(json.dumps(event_data) + "\n")
                f.flush()
        except Exception as e:
            print(f"Error writing event: {e}", file=sys.stderr)

    def on_created(self, event):
        self._write_event("created", event.src_path)

    def on_deleted(self, event):
        self._write_event("deleted", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self._write_event("modified", event.src_path)

    def on_moved(self, event):
        self._write_event("moved", event.src_path, event.dest_path)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: filesystem_monitor.py <watch_path>")
        sys.exit(1)

    watch_path = sys.argv[1]

    # Clear any existing events file
    try:
        os.remove("/tmp/fs_events.jsonl")
    except:
        pass

    event_handler = ContainerFileSystemHandler()
    observer = Observer()
    observer.schedule(event_handler, watch_path, recursive=True)

    observer.start()
    print(f"Monitoring filesystem changes in {watch_path}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
