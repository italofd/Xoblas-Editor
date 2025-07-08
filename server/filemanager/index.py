from typing import Dict
import asyncio
from terminal.docker_manager import DockerManager
from .filesystem_watcher import FilesystemWatcher


class FileManager:
    def __init__(self, docker_manager: DockerManager):
        self.docker_manager = docker_manager
        self.filesystem_watcher = FilesystemWatcher(docker_manager)

    async def start_filesystem_watcher(self, websocket_callback):
        """Start the bidirectional filesystem watcher."""
        self.filesystem_watcher.set_websocket_callback(websocket_callback)
        await self.filesystem_watcher.start_watching()

        # Start polling for changes in background
        asyncio.create_task(self.filesystem_watcher.poll_for_changes())

    async def stop_filesystem_watcher(self):
        """Stop the filesystem watcher."""
        await self.filesystem_watcher.stop_watching()

    async def handle_file_operations(self, operations_data: Dict) -> Dict:
        """Handle batch file operations with optimized directory detection."""
        results = []

        # Mark operations as pending to avoid feedback loops
        operation = operations_data["operation"]
        for file_info in operations_data.get("files", []):
            path = file_info["path"]
            self.filesystem_watcher.mark_operation_pending(operation, path)

            # For rename operations, mark both old and new paths
            if operation == "rename" and "oldPath" in file_info:
                self.filesystem_watcher.mark_operation_pending(
                    "delete", file_info["oldPath"]
                )
                self.filesystem_watcher.mark_operation_pending("create", path)

        for file_info in operations_data.get("files", []):
            path = file_info["path"]
            operation = operations_data["operation"]

            # Smart directory detection (your optimized approach)
            is_directory = file_info["isDirectory"]

            try:
                if operation == "create":
                    result = await self._handle_create(path, is_directory)
                elif operation == "delete":
                    result = await self._handle_delete(path, is_directory)
                elif operation == "change":
                    result = await self._handle_change(path, is_directory)
                elif operation == "rename":
                    old_path = file_info.get("oldPath")
                    result = await self._handle_rename(old_path, path, is_directory)

                results.append(
                    {
                        "path": path,
                        "oldPath": file_info.get("oldPath"),
                        "isDirectory": is_directory,
                        "operation": operation,
                        "success": result["success"],
                        "error": result.get("error"),
                    }
                )

            except Exception as e:
                results.append(
                    {
                        "path": path,
                        "oldPath": file_info.get("oldPath"),
                        "isDirectory": is_directory,
                        "operation": operation,
                        "success": False,
                        "error": str(e),
                    }
                )

        return {
            "type": "file_operation_result",
            "operation": operations_data["operation"],
            "success": all(r["success"] for r in results),
            "files": results,
            "timestamp": operations_data.get("timestamp"),
        }

    async def _smart_is_directory(self, path: str) -> bool:
        """Smart directory detection using your optimized approach."""
        # Fast file extension check
        if self._has_file_extension(path):
            return False

        # If no extension detected, use stat (only when necessary)
        try:
            stdout, stderr = await self.docker_manager.exec_command(
                f"stat -c '%F' '{path}' 2>/dev/null"
            )
            if not stderr:
                return "directory" in stdout.decode().lower()
        except:
            pass

        return False

    def _has_file_extension(self, path: str) -> bool:
        """Check if path has file extension."""
        import os

        basename = os.path.basename(path)
        return "." in basename and not basename.startswith(".")

    async def _handle_create(self, path: str, is_directory: bool) -> Dict:
        """Handle file/directory creation."""
        print(f"EVA01 Creating file/directory: {path}, is_directory: {is_directory}")
        if is_directory:
            _, stderr = await self.docker_manager.exec_command(f"mkdir -p '{path}'")
        else:
            _, stderr = await self.docker_manager.exec_command(f"touch '{path}'")

        return {"success": not stderr, "error": stderr.decode() if stderr else None}

    async def _handle_delete(self, path: str, is_directory: bool) -> Dict:
        """Handle file/directory deletion."""
        if is_directory:
            _, stderr = await self.docker_manager.exec_command(f"rm -rf '{path}'")
        else:
            _, stderr = await self.docker_manager.exec_command(f"rm -f '{path}'")

        return {"success": not stderr, "error": stderr.decode() if stderr else None}

    async def _handle_change(self, path: str, is_directory: bool) -> Dict:
        """Handle file/directory change (could trigger file watchers)."""
        # For now, just verify the path exists
        _, stderr = await self.docker_manager.exec_command(f"test -e '{path}'")

        return {
            "success": not stderr,
            "error": "File/directory does not exist" if stderr else None,
        }

    async def _handle_rename(
        self, old_path: str, new_path: str, is_directory: bool
    ) -> Dict:
        """Handle file/directory rename."""
        _, stderr = await self.docker_manager.exec_command(
            f"mv '{old_path}' '{new_path}'"
        )

        return {"success": not stderr, "error": stderr.decode() if stderr else None}
