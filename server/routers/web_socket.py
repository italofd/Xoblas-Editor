from fastapi import WebSocket, APIRouter
from typing import Dict
from terminal.xoblas_editor import XoblasEditor
import json
import re


# Dictionary to store active terminal sessions
active_terminals: Dict[str, XoblasEditor] = {}


router = APIRouter(
    prefix="/ws",
    tags=["websocket"],
)


@router.websocket("/terminal/{user_id}")
async def ws_terminal(websocket: WebSocket, user_id: str):
    # Generate a unique session ID based on the user_id (Anonymous, coming from the front-end)
    session_id = user_id

    session_id = user_id.lower()

    # Replace all disallowed characters with a dash or remove them
    # This is to not break docker volume name pattern
    sanitized = re.sub(r"[^a-z0-9_.-]", "-", user_id)

    try:
        await websocket.accept()

        # Create and start a new PTY shell session
        editor = XoblasEditor(user_id=sanitized)
        await editor.start()

        active_terminals[session_id] = editor

        # Send initial prompt (perhaps, it could be executed in the initialization)
        initial_result = await editor.execute("")

        await websocket.send_json(initial_result)

        # Sync file stored on container with UI
        main_file = await editor.read_from_file()

        # File path will be implemented if we have multiple of them =) (multi file editor)
        await websocket.send_json(
            {"type": "file", "content": main_file, "file_path": ""}
        )

        while True:
            # Receive command from client
            data = await websocket.receive_text()

            json_data = json.loads(data)

            req_type = json_data.get("type")

            print(f"Incoming reqType:{req_type}")

            # To execute a terminal command
            if req_type == "command":
                command = json_data.get("command")

                if editor.is_xoblas_command(command):
                    file_structure = await editor.xoblas_editor_command(command)

                    await websocket.send_json(
                        {"type": "xoblas", "file_structure": file_structure}
                    )

                else:
                    # Write command to shell
                    result = await editor.execute(command)

                    await websocket.send_json(result)

            # To save a file
            elif req_type == "write_file":
                await editor.write_to_file(code_content=json_data.get("content"))

            # Indicating raw mode "alternate screen" for text editors
            elif req_type == "input":
                result = await editor.execute(json_data.get("data"))

                # [TO-DO]: Make this object trough a function instead of repeating code
                # When exiting a alternate screen we always check the file that is opened
                if result.get("is_exiting_raw"):
                    file = await editor.read_from_file()
                    await websocket.send_json(
                        {
                            "type": "file",
                            "content": file,
                            "file_path": "",
                        }
                    )

                await websocket.send_json(result)

            elif req_type == "resize":
                _, cols, rows = json_data.values()
                if editor.pty.in_alternate_screen:
                    result = await editor.resize(rows, cols)

                    await websocket.send_json(result)

                else:
                    await editor.resize(rows, cols)

    except Exception as e:
        print(f"Terminal error: {e}")
        await editor.close()

    finally:
        # Clean up the shell session
        if session_id in active_terminals:
            await editor.close()
