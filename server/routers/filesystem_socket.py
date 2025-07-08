from fastapi import WebSocket, APIRouter
from typing import Dict
import json
import re
from filemanager.index import FileManager
from terminal.docker_manager import DockerManager
from terminal.terminal_config import TerminalConfig

# Dictionary to store active filesystem sessions
active_filesystem_sessions: Dict[str, FileManager] = {}

router = APIRouter(
    prefix="/ws",
    tags=["filesystem"],
)


@router.websocket("/filesystem/{user_id}")
async def ws_filesystem(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for file system operations"""

    # Sanitize user_id for Docker compatibility
    sanitized_user_id = re.sub(r"[^a-z0-9_.-]", "-", user_id.lower())

    try:
        await websocket.accept()

        # Initialize file manager with docker manager
        config = TerminalConfig()
        docker_manager = DockerManager.get_or_create(sanitized_user_id, config)

        # Ensure container is running with proper synchronization
        await docker_manager.ensure_container_running()

        file_manager = FileManager(docker_manager)
        active_filesystem_sessions[sanitized_user_id] = file_manager

        print(f"Filesystem WebSocket connected for user: {sanitized_user_id}")

        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "filesystem_connected",
                "message": "Filesystem WebSocket connected successfully",
            }
        )

        while True:
            # Receive file operation from client
            data = await websocket.receive_text()

            try:
                json_data = json.loads(data)
                operation_type = json_data.get("type")

                print(f"Received filesystem operation: {operation_type}")

                if operation_type == "file_operation":
                    # Process the file operation batch
                    operation_data = json_data.get("data", {})

                    # Handle the file operations using FileManager
                    result = await file_manager.handle_file_operations(operation_data)

                    # Send result back to client
                    await websocket.send_json(result)

                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": f"Unknown operation type: {operation_type}",
                        }
                    )

            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON message"}
                )
            except Exception as e:
                print(f"Error processing filesystem operation: {e}")
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": f"Error processing operation: {str(e)}",
                    }
                )

    except Exception as e:
        print(f"Filesystem WebSocket error: {e}")

    finally:
        # Clean up the filesystem session
        if sanitized_user_id in active_filesystem_sessions:
            del active_filesystem_sessions[sanitized_user_id]
        print(f"Filesystem WebSocket disconnected for user: {sanitized_user_id}")
