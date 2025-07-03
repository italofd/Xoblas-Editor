from typing import Dict, Optional
from lsp.base_controller import BaseLSPController
from lsp.controllers.python_controller import PythonLSPController


class LSPManager:
    def __init__(self):
        self.active_lsps: Dict[str, BaseLSPController] = {}
        self.language_controllers = {
            "python": PythonLSPController,
            # Add more languages here:
            # "javascript": JavaScriptLSPController,
            # "typescript": TypeScriptLSPController,
        }

    def _get_session_key(self, user_id: str, language: str) -> str:
        """Generate session key for user + language"""
        return f"{user_id}:{language}"

    async def get_or_create_lsp(
        self, user_id: str, language: str
    ) -> Optional[BaseLSPController]:
        """Get existing LSP or create new one"""
        session_key = self._get_session_key(user_id, language)

        # Return existing LSP if available
        if session_key in self.active_lsps:
            return self.active_lsps[session_key]

        # Create new LSP
        controller_class = self.language_controllers.get(language)
        if not controller_class:
            print(f"Unsupported language: {language}")
            return None

        controller = controller_class(user_id)
        if await controller.start():
            self.active_lsps[session_key] = controller
            return controller

        return None

    async def close_lsp(self, user_id: str, language: str):
        """Close LSP for user + language"""
        session_key = self._get_session_key(user_id, language)

        if session_key in self.active_lsps:
            await self.active_lsps[session_key].close()
            del self.active_lsps[session_key]

    async def close_all_user_lsps(self, user_id: str):
        """Close all LSPs for a user"""
        to_remove = []

        for session_key, lsp in self.active_lsps.items():
            if session_key.startswith(f"{user_id}:"):
                await lsp.close()
                to_remove.append(session_key)

        for key in to_remove:
            del self.active_lsps[key]

    def get_supported_languages(self) -> list:
        """Get list of supported languages"""
        return list(self.language_controllers.keys())


# Global LSP manager instance
lsp_manager = LSPManager()
