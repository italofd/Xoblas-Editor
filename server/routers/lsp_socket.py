from fastapi import WebSocket, APIRouter
import json
import re
from lsp.manager import lsp_manager


router = APIRouter(
    prefix="/ws",
    tags=["lsp"],
)


@router.websocket("/lsp/{user_id}")
async def ws_lsp(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for LSP communication"""

    # Sanitize user_id for Docker compatibility
    sanitized_user_id = re.sub(r"[^a-z0-9_.-]", "-", user_id.lower())

    try:
        await websocket.accept()

        # Send supported languages
        await websocket.send_json(
            {
                "type": "supported_languages",
                "languages": lsp_manager.get_supported_languages(),
            }
        )

        while True:
            data = await websocket.receive_text()
            json_data = json.loads(data)

            req_type = json_data.get("type")
            language = json_data.get("language")

            if not language:
                await websocket.send_json(
                    {"type": "error", "message": "Language is required"}
                )
                continue

            # Get or create LSP instance
            lsp = await lsp_manager.get_or_create_lsp(sanitized_user_id, language)

            if not lsp:
                await websocket.send_json(
                    {"type": "error", "message": f"Failed to start LSP for {language}"}
                )
                continue

            try:
                if req_type == "completion":
                    result = await lsp.completion(
                        json_data.get("file_path", "/home/termuser/root/main.py"),
                        json_data.get("line", 0),
                        json_data.get("character", 0),
                        json_data.get("text", ""),
                    )
                    await websocket.send_json({"type": "completion", "data": result})

                elif req_type == "hover":
                    result = await lsp.hover(
                        json_data.get("file_path", "/home/termuser/root/main.py"),
                        json_data.get("line", 0),
                        json_data.get("character", 0),
                        json_data.get("text", ""),
                    )
                    await websocket.send_json({"type": "hover", "data": result})

                elif req_type == "diagnostics":
                    result = await lsp.diagnostics(
                        json_data.get("file_path", "/home/termuser/root/main.py"),
                        json_data.get("text", ""),
                    )
                    await websocket.send_json({"type": "diagnostics", "data": result})

                else:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": f"Unknown request type: {req_type}",
                        }
                    )

            except Exception as e:
                await websocket.send_json(
                    {"type": "error", "message": f"LSP error: {str(e)}"}
                )

    except Exception as e:
        print(f"LSP WebSocket error: {e}")

    finally:
        # Clean up LSPs for this user when disconnecting
        await lsp_manager.close_all_user_lsps(sanitized_user_id)
