import asyncio
from typing import Dict, Set, Optional, Callable, Awaitable
import json
import base64
from pathlib import Path


class FilesystemWatcher:
    """
    Bidirectional filesystem watcher that monitors changes in the Docker container
    and sends notifications to the webapp while avoiding loops from self-initiated changes.
    """

    def __init__(self, docker_manager, watch_path: str = "/home/termuser/root"):
        self.docker_manager = docker_manager
        self.watch_path = watch_path
        self.observer = None
        self.websocket = None
        self.is_running = False

        # Track operations initiated by the webapp to avoid feedback loops
        self.pending_operations: Set[str] = set()

        # Callback for sending messages to webapp
        self.send_callback: Optional[Callable[[Dict], Awaitable[None]]] = None

    def set_websocket_callback(self, callback: Callable[[Dict], Awaitable[None]]):
        """Set the callback function for sending messages to the webapp."""
        self.send_callback = callback

    async def start_watching(self):
        """Start the filesystem watcher inside the Docker container."""
        if self.is_running:
            return

        try:
            # Ensure the watch directory exists in the container
            await self.docker_manager.exec_command(f"mkdir -p {self.watch_path}")

            # Start the watcher script inside the container
            await self._start_container_watcher()

            self.is_running = True
            print(f"Filesystem watcher started for path: {self.watch_path}")

        except Exception as e:
            print(f"Failed to start filesystem watcher: {e}")
            raise

    async def stop_watching(self):
        """Stop the filesystem watcher."""
        if not self.is_running:
            return

        try:
            # Stop the watcher process in the container
            await self.docker_manager.exec_command(
                "pkill -f 'python.*filesystem_monitor.py'"
            )
            self.is_running = False
            print("Filesystem watcher stopped")
        except Exception as e:
            print(f"Error stopping filesystem watcher: {e}")

    async def _start_container_watcher(self):
        """Start the watcher script inside the container."""
        # Read the monitoring script from the external file
        monitor_script = self._load_monitor_script()

        # Write the script to the container
        encoded_script = base64.b64encode(monitor_script.encode()).decode()
        await self.docker_manager.exec_command(
            f"echo '{encoded_script}' | base64 -d > /tmp/filesystem_monitor.py"
        )

        # Make it executable and start it in the background
        await self.docker_manager.exec_command("chmod +x /tmp/filesystem_monitor.py")

        # Start the monitor in the background with nohup
        await self.docker_manager.exec_command(
            f"nohup python3 /tmp/filesystem_monitor.py {self.watch_path} > /tmp/fs_monitor.log 2>&1 &"
        )

    def _load_monitor_script(self) -> str:
        """Load the monitoring script from the external file."""
        script_path = Path(__file__).parent / "filesystem_monitor.py"

        try:
            with open(script_path, "r") as f:
                return f.read()
        except FileNotFoundError:
            raise FileNotFoundError(f"Monitoring script not found at {script_path}")
        except Exception as e:
            raise Exception(f"Failed to load monitoring script: {e}")

    def mark_operation_pending(self, operation_type: str, path: str):
        """Mark an operation as pending to avoid feedback loops."""
        operation_key = f"{operation_type}:{path}"
        self.pending_operations.add(operation_key)

        # Remove the operation after timeout
        asyncio.create_task(self._remove_pending_operation(operation_key))

    async def _remove_pending_operation(self, operation_key: str):
        """Remove a pending operation after timeout."""
        self.pending_operations.discard(operation_key)

    def _is_self_initiated(self, event_type: str, path: str) -> bool:
        """Check if this event was initiated by our own operations."""
        operation_key = f"{event_type}:{path}"
        return operation_key in self.pending_operations

    async def poll_for_changes(self):
        """Poll for filesystem changes from the container and send to webapp."""
        events_file = "/tmp/fs_events.jsonl"
        last_size = 0

        while self.is_running:
            try:
                # Check if events file exists and has new content
                stdout, stderr = await self.docker_manager.exec_command(
                    f"test -f {events_file} && wc -c < {events_file} || echo 0"
                )

                if not stderr:
                    current_size = int(stdout.decode().strip())

                    if current_size > last_size:
                        # Read new events
                        stdout, stderr = await self.docker_manager.exec_command(
                            f"tail -c +{last_size + 1} {events_file}"
                        )

                        if not stderr and stdout:
                            events_data = stdout.decode().strip()
                            await self._process_events(events_data)

                        last_size = current_size

                # Poll every 500ms
                await asyncio.sleep(0.5)

            except Exception as e:
                print(f"Error polling for filesystem changes: {e}")
                await asyncio.sleep(1)

    async def _process_events(self, events_data: str):
        """Process filesystem events and send to webapp."""
        if not events_data or not self.send_callback:
            return

        try:
            for line in events_data.split("\n"):
                if not line.strip():
                    continue

                event = json.loads(line)
                event_type = event.get("event_type")
                src_path = event.get("src_path")

                # Skip if this was a self-initiated operation
                if self._is_self_initiated(event_type, src_path):
                    print(f"Skipping self-initiated event: {event_type} {src_path}")
                    continue

                # Convert to webapp format
                webapp_event = self._convert_to_webapp_format(event)

                # Send to webapp
                await self.send_callback(webapp_event)

        except Exception as e:
            print(f"Error processing filesystem events: {e}")

    def _convert_to_webapp_format(self, container_event: Dict) -> Dict:
        """Convert container filesystem event to webapp format."""
        event_type = container_event["event_type"]
        src_path = container_event["src_path"]
        is_directory = container_event["is_directory"]

        # Map container events to webapp operations
        operation_map = {
            "created": "create",
            "deleted": "delete",
            "modified": "change",
            "moved": "rename",
        }

        operation = operation_map.get(event_type, "change")

        file_info = {
            "path": src_path,
            "isDirectory": is_directory,
            "operation": operation,
        }

        # Handle rename/move operations
        if event_type == "moved" and "dest_path" in container_event:
            file_info["oldPath"] = src_path
            file_info["path"] = container_event["dest_path"]
            file_info["isDirectory"] = container_event.get(
                "dest_is_directory", is_directory
            )

        return {
            "type": "filesystem_change_from_container",
            "operation": operation,
            "files": [file_info],
            "timestamp": container_event["timestamp"],
            "source": "container",
        }
