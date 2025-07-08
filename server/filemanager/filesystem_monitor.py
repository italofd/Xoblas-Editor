#!/usr/bin/env python3
import sys
import json
import time
import os
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


class ContainerFileSystemHandler(FileSystemEventHandler):
    def __init__(self, output_file="/tmp/fs_events.jsonl"):
        self.output_file = output_file
        # Debounce rapid-fire events
        self.recent_events = {}
        self.debounce_time = 0.1  # 100ms debounce

    def _should_ignore_path(self, path):
        """Ignore certain paths that we don't want to monitor."""
        ignore_patterns = [
            "/.git/",
            "__pycache__",
            ".pyc",
            ".tmp",
            "/tmp/",
            "fs_events.jsonl",
            "filesystem_monitor.py",
            "fs_monitor.log",
        ]

        for pattern in ignore_patterns:
            if pattern in path:
                return True
        return False

    def _is_directory(self, path):
        """Check if path is a directory."""
        try:
            return os.path.isdir(path)
        except:
            # If we can't stat it, check if it has an extension
            return "." not in os.path.basename(path)

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

        event_data = {
            "type": "filesystem_change",
            "event_type": event_type,
            "src_path": src_path,
            "is_directory": self._is_directory(src_path),
            "timestamp": current_time,
        }

        if dest_path:
            event_data["dest_path"] = dest_path
            event_data["dest_is_directory"] = self._is_directory(dest_path)

        try:
            with open(self.output_file, "a") as f:
                f.write(json.dumps(event_data) + "\n")
                f.flush()
        except Exception as e:
            print(f"Error writing event: {e}", file=sys.stderr)

    def on_created(self, event):
        if not event.is_directory:
            self._write_event("created", event.src_path)
        else:
            self._write_event("created", event.src_path)

    def on_deleted(self, event):
        self._write_event("deleted", event.src_path)

    def on_modified(self, event):
        if not event.is_directory:  # Only track file modifications
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
