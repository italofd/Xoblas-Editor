from fastapi import WebSocket, APIRouter
from typing import Dict
import uuid
from terminal.pty_shell import PtyShell

# Dictionary to store active terminal sessions
active_terminals: Dict[str, PtyShell] = {}


router = APIRouter(
    prefix="/ws",
    tags=["websocket"],
)


@router.websocket("/terminal")
async def ws_terminal(websocket: WebSocket):
    # Generate a unique session ID
    session_id = str(uuid.uuid4())

    try:
        await websocket.accept()

        # Create and start a new PTY shell session
        shell = PtyShell()
        await shell.start()
        active_terminals[session_id] = shell

        # Send initial prompt (perhaps, it could be executed in the initialization)
        await shell.execute("")

        while True:
            # Receive command from client
            data = await websocket.receive_text()

            # Write command to shell
            result = await shell.execute(data)

            await websocket.send_text(result)

    except Exception as e:
        print(f"Terminal error: {e}")
    finally:
        # Clean up the shell session
        if session_id in active_terminals:
            await active_terminals[session_id].close()
            del active_terminals[session_id]
