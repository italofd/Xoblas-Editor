import asyncio
from typing import Dict, Set, Optional, Callable, Awaitable
import json
import base64
from pathlib import Path
import time


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

        # Track container stopping state
        self.is_container_stopping = False

        # Track operations initiated by the webapp to avoid feedback loops
        self.pending_operations: Set[str] = set()

        # Callback for sending messages to webapp
        self.send_callback: Optional[Callable[[Dict], Awaitable[None]]] = None

    def set_websocket_callback(self, callback: Callable[[Dict], Awaitable[None]]):
        """Set the callback function for sending messages to the webapp."""
        self.send_callback = callback

    def is_container_available(self) -> bool:
        """Check if container is available (running and not stopping)."""
        return (
            not self.is_container_stopping
            and self.docker_manager.is_container_running()
        )

    async def start_watching(self):
        """Start the filesystem watcher inside the Docker container."""
        if self.is_running:
            return

        # Check if container is available before starting
        if not self.is_container_available():
            raise Exception("Container is not available (stopped or stopping)")

        try:
            # Ensure the watch directory exists in the container
            await self.docker_manager.exec_command(f"mkdir -p {self.watch_path}")

            # Start the watcher script inside the container
            await self._start_container_watcher()

            # Perform initial sync after watcher is started
            await self._perform_initial_sync()

            self.is_running = True
            print(f"Filesystem watcher started for path: {self.watch_path}")

        except Exception as e:
            print(f"Failed to start filesystem watcher: {e}")
            raise

    async def stop_watching(self):
        """Stop the filesystem watcher."""
        if not self.is_running:
            return

        # Mark that we're stopping (not the container, just the watcher)
        self.is_running = False

        try:
            # Stop the watcher process in the container only if container is still available
            if self.is_container_available():
                await self.docker_manager.exec_command(
                    "pkill -f 'python.*filesystem_monitor.py'"
                )
            print("Filesystem watcher stopped")
        except Exception as e:
            print(f"Error stopping filesystem watcher: {e}")

    def mark_container_stopping(self):
        """Mark the container as stopping to prevent new operations."""
        self.is_container_stopping = True
        self.is_running = False
        print("Container marked as stopping - filesystem watcher disabled")

    def reset_container_state(self):
        """Reset container state for potential reconnection."""
        self.is_container_stopping = False
        print("Container state reset - ready for reconnection")

    async def _start_container_watcher(self):
        """Start the watcher script inside the container."""
        # Double-check container availability before proceeding
        if not self.is_container_available():
            raise Exception("Container became unavailable during watcher startup")

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

    async def _perform_initial_sync(self):
        """Perform initial filesystem sync from container to webapp."""
        if not self.send_callback:
            print("No send callback available for initial sync")
            return

        try:
            print(f"Starting initial filesystem sync from {self.watch_path}")

            # Get complete file tree with content from container
            file_tree = await self._get_complete_file_tree(self.watch_path)

            if file_tree:
                # Send initial sync message to webapp
                sync_message = {
                    "type": "filesystem_initial_sync",
                    "files": file_tree,
                    "timestamp": time.time(),
                    "source": "container",
                    "watch_path": self.watch_path,
                }

                await self.send_callback(sync_message)
                print(f"Initial sync completed: {len(file_tree)} items")
            else:
                print("No files found during initial sync")

        except Exception as e:
            print(f"Error during initial filesystem sync: {e}")

    async def _get_complete_file_tree(self, root_path: str) -> list:
        """Get complete file tree with content from container."""
        try:
            # Use find command to get all files and directories, excluding common problematic paths
            stdout, stderr = await self.docker_manager.exec_command(
                f"find '{root_path}' \\( -path '*/.git' -o -path '*/__pycache__' -o -path '*/node_modules' -o -path '*/.vscode' \\) -prune -o -type f -print -o -type d -print | head -500"
            )

            if stderr:
                print(f"Error getting file tree: {stderr.decode()}")
                return []

            paths = [
                p.strip() for p in stdout.decode().strip().split("\n") if p.strip()
            ]
            file_tree = []

            print(f"Processing {len(paths)} paths for initial sync...")

            for path in paths:
                if not path.strip():
                    continue

                try:
                    file_info = await self._get_file_info_with_content(path)
                    if file_info:
                        file_tree.append(file_info)
                except Exception as e:
                    print(f"Error processing {path} during sync: {e}")
                    continue

            return file_tree

        except Exception as e:
            print(f"Error getting complete file tree: {e}")
            return []

    async def _get_file_info_with_content(self, path: str) -> dict:
        """Get file info with content for a specific path."""
        try:
            # Check if file exists and get basic info - use simpler stat format
            stdout, stderr = await self.docker_manager.exec_command(
                f"test -e '{path}' && stat -c '%F|%s|%Y|%a' '{path}' || echo 'not_found'"
            )

            if stderr or stdout.decode().strip() == "not_found":
                return None

            stat_output = stdout.decode().strip()
            stat_parts = stat_output.split("|")

            if len(stat_parts) != 4:
                print(f"Unexpected stat output for {path}: {stat_output}")
                return None

            file_type = stat_parts[0]
            file_size = int(stat_parts[1])
            mtime = float(stat_parts[2])
            permissions = stat_parts[3]

            is_directory = "directory" in file_type

            file_info = {
                "path": path,
                "isDirectory": is_directory,
                "operation": "create",  # For initial sync, everything is a "create"
                "fileInfo": {
                    "size": file_size,
                    "mtime": mtime,
                    "permissions": permissions,
                    "name": path.split("/")[-1],
                },
            }

            # Add content for files (not directories)
            if not is_directory and file_size <= self.max_file_size:
                content_info = await self.read_file_content(path)
                if "content" in content_info:
                    file_info["content"] = content_info["content"]
                    file_info["contentType"] = content_info["contentType"]
                elif content_info.get("contentType") == "file_too_large":
                    file_info["contentType"] = "file_too_large"

            return file_info

        except Exception as e:
            print(f"Error getting file info for {path}: {e}")
            return None

    # Add max file size property
    max_file_size = 10 * 1024 * 1024  # 10MB limit

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
        await asyncio.sleep(2.0)  # Wait 2 seconds before removing
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
                # Check if container is still available before polling
                if not self.is_container_available():
                    print("Container no longer available - stopping filesystem polling")
                    self.is_running = False
                    break

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
                # Check if this might be due to container stopping
                if not self.is_container_available():
                    print("Container stopped during polling - exiting")
                    self.is_running = False
                    break
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

        # Add file metadata if available
        if "file_info" in container_event:
            file_info["fileInfo"] = container_event["file_info"]

        # Include content for create and modify operations (not delete since file doesn't exist)
        if not is_directory and operation in ["create", "change"]:
            if "content" in container_event:
                file_info["content"] = container_event["content"]
                file_info["contentType"] = container_event["content_type"]

        # Handle rename/move operations
        if event_type == "moved" and "dest_path" in container_event:
            file_info["oldPath"] = src_path
            file_info["path"] = container_event["dest_path"]
            file_info["isDirectory"] = container_event.get(
                "dest_is_directory", is_directory
            )

            # Add destination file info and content for moves
            if "dest_file_info" in container_event:
                file_info["fileInfo"] = container_event["dest_file_info"]

            # Include content for the destination file in move operations
            if not container_event.get("dest_is_directory", is_directory):
                if "dest_content" in container_event:
                    file_info["content"] = container_event["dest_content"]
                    file_info["contentType"] = container_event["dest_content_type"]

        return {
            "type": "filesystem_change_from_container",
            "operation": operation,
            "files": [file_info],
            "timestamp": container_event["timestamp"],
            "source": "container",
        }

    async def read_file_content(self, file_path: str) -> Dict:
        """Read file content from the container - try UTF-8, fallback to binary."""
        try:
            # Check if file exists and get size
            stdout, stderr = await self.docker_manager.exec_command(
                f"test -f '{file_path}' && stat -c '%s' '{file_path}' 2>/dev/null || echo '0'"
            )

            if stderr:
                return {"error": "File not found"}

            try:
                file_size = int(stdout.decode().strip())
            except ValueError:
                return {"error": "Could not determine file size"}

            if file_size > 10 * 1024 * 1024:  # 10MB limit
                return {
                    "content": None,
                    "contentType": "file_too_large",
                    "fileInfo": {"size": file_size},
                }

            if file_size == 0:
                return {"content": "", "contentType": "text", "fileInfo": {"size": 0}}

            # Try to read as UTF-8 text first
            stdout, stderr = await self.docker_manager.exec_command(
                f"cat '{file_path}' 2>/dev/null"
            )

            if not stderr and stdout:
                try:
                    # Try to decode as UTF-8
                    content = stdout.decode("utf-8")
                    return {
                        "content": content,
                        "contentType": "text",
                        "fileInfo": {"size": file_size},
                    }
                except UnicodeDecodeError:
                    # If UTF-8 fails, read as binary
                    pass

            # Fallback to binary
            stdout, stderr = await self.docker_manager.exec_command(
                f"base64 '{file_path}' 2>/dev/null"
            )

            if not stderr and stdout:
                return {
                    "content": stdout.decode().strip(),
                    "contentType": "binary",
                    "fileInfo": {"size": file_size},
                }

            return {"error": "Failed to read file content"}

        except Exception as e:
            return {"error": f"Error reading file: {str(e)}"}

    async def save_file_content(
        self, file_path: str, content: str, content_type: str = "text"
    ):
        """Save file content to the container."""
        try:
            # Mark this operation as pending to avoid feedback loops
            self.mark_operation_pending("modified", file_path)

            # Ensure directory exists
            dir_path = str(Path(file_path).parent)
            await self.docker_manager.exec_command(f"mkdir -p '{dir_path}'")

            if content_type == "binary":
                # Decode base64 and write binary file
                await self.docker_manager.exec_command(
                    f"echo '{content}' | base64 -d > '{file_path}'"
                )
            else:
                # Write UTF-8 text file
                escaped_content = content.replace("'", "'\\''")
                await self.docker_manager.exec_command(
                    f"cat > '{file_path}' << 'EOF'\n{escaped_content}\nEOF"
                )

            return {"success": True}

        except Exception as e:
            return {"error": f"Failed to save file: {str(e)}"}

            return {"error": f"Failed to save file: {str(e)}"}
