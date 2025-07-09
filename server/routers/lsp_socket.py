from fastapi import WebSocket, APIRouter
import json
import re
import asyncio
import uuid
from lsp.manager import lsp_manager
from terminal.docker_manager import DockerManager


router = APIRouter(
    prefix="/ws",
    tags=["lsp"],
)


@router.websocket("/lsp/{user_id}")
async def ws_lsp(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for LSP communication"""

    # Sanitize user_id for Docker compatibility
    sanitized_user_id = re.sub(r"[^a-z0-9_.-]", "-", user_id.lower())

    # Generate unique connection ID for this WebSocket
    connection_id = f"lsp_{uuid.uuid4().hex[:8]}"

    try:
        await websocket.accept()

        # Register this connection
        DockerManager.register_connection(sanitized_user_id, connection_id)

        # Get or create LSP instance for this user
        lsp = await lsp_manager.get_or_create_lsp(sanitized_user_id, "python")

        if not lsp:
            await websocket.send_json(
                {"type": "error", "message": "Failed to start LSP server"}
            )
            return

        # Start a background task to continuously read from the LSP server
        read_task = asyncio.create_task(read_from_lsp(lsp, websocket))

        # Forward messages from client to LSP server
        try:
            while True:
                data = await websocket.receive_text()

                # Send the raw message to the LSP server
                if lsp.process and lsp.process.stdin:
                    try:
                        # Parse to validate it's proper JSON
                        parsed_data = json.loads(data)

                        # Handle Content-Length header format required by LSP
                        json_content = json.dumps(parsed_data)
                        message = (
                            f"Content-Length: {len(json_content)}\r\n\r\n{json_content}"
                        )

                        # Send to LSP server
                        lsp.process.stdin.write(message.encode())

                        await lsp.process.stdin.drain()
                    except json.JSONDecodeError:
                        await websocket.send_json(
                            {"type": "error", "message": "Invalid JSON message"}
                        )
        finally:
            # Cancel the background reading task when the main loop exits
            read_task.cancel()
            try:
                await read_task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        print(f"LSP WebSocket error: {e}")

    finally:
        # Unregister this connection
        DockerManager.unregister_connection(sanitized_user_id, connection_id)

        # Clean up LSPs for this user when disconnecting
        await lsp_manager.close_all_user_lsps(sanitized_user_id)


async def read_from_lsp(lsp, websocket: WebSocket):
    """Continuously read messages from the LSP server and forward them to the client"""
    try:
        while True:
            if not lsp.process or not lsp.process.stdout:
                break

            # Read headers
            headers = {}
            while True:
                line = await lsp.process.stdout.readline()
                if not line:  # EOF
                    return

                line_str = line.decode().strip()
                if not line_str:
                    break

                if ":" in line_str:
                    key, value = line_str.split(":", 1)
                    headers[key.strip()] = value.strip()

            # Read content
            content_length = int(headers.get("Content-Length", 0))
            if content_length == 0:
                continue

            content = await lsp.process.stdout.read(content_length)
            if not content:  # EOF
                return

            # Parse and forward to client
            try:
                response = json.loads(content.decode())
                await websocket.send_text(json.dumps(response))
            except json.JSONDecodeError:
                print(f"Failed to parse LSP response: {content}")
            except Exception as e:
                print(f"Error forwarding LSP response: {e}")

    except asyncio.CancelledError:
        # Task was cancelled, exit gracefully
        return
    except Exception as e:
        print(f"LSP reader error: {e}")
