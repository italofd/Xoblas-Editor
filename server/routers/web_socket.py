from fastapi import WebSocket, APIRouter
from typing import Dict
import uuid
from terminal.pty_shell import PtyShell
import json
import base64
from urllib.parse import unquote


# Dictionary to store active terminal sessions
active_terminals: Dict[str, PtyShell] = {}


router = APIRouter(
    prefix="/ws",
    tags=["websocket"],
)


@router.websocket("/terminal/{user_id}")
async def ws_terminal(websocket: WebSocket, user_id: str):
    # Generate a unique session ID based on the user_id (Anonymous, coming from the front-end)
    session_id = unquote(user_id)

    try:
        await websocket.accept()

        # Create and start a new PTY shell session
        shell = PtyShell()
        await shell.start()
        active_terminals[session_id] = shell

        # Send initial prompt (perhaps, it could be executed in the initialization)
        initial_result = await shell.execute("")

        await websocket.send_json(initial_result)

        while True:
            # Receive command from client
            data = await websocket.receive_text()

            json_data = json.loads(data)

            req_type = json_data.get("type")

            if req_type == "command":
                # Write command to shell
                result = await shell.execute(json_data.get("command"))

                await websocket.send_json(result)
            else:
                _, cols, rows = json_data.values()

                await shell.resize(rows, cols)

    except Exception as e:
        print(f"Terminal error: {e}")
        await shell.close()

    finally:
        # Clean up the shell session
        if session_id in active_terminals:
            await shell.close()
