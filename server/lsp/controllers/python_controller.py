from typing import Dict, Any, List
from lsp.base_controller import BaseLSPController


class PythonLSPController(BaseLSPController):
    def __init__(self, user_id: str):
        super().__init__(user_id, "python")

    async def install_lsp_server(self) -> bool:
        """Install pylsp (Python LSP Server)"""
        try:
            # Check if already installed
            _, stderr = await self.docker.exec_command("which pylsp")
            if not stderr:
                return True

            # Install pylsp
            install_cmd = (
                "pip install python-lsp-server[all] pylsp-mypy python-lsp-black"
            )
            _, stderr = await self.docker.exec_command(install_cmd)

            if stderr:
                print(f"LSP installation warning: {stderr.decode()}")

            # Verify installation
            _, stderr = await self.docker.exec_command("which pylsp")
            return not stderr

        except Exception as e:
            print(f"Failed to install Python LSP: {e}")
            return False

    def get_lsp_command(self) -> List[str]:
        """Get command to start pylsp"""
        return ["pylsp"]

    def get_initialization_options(self) -> Dict[str, Any]:
        return {
            "plugins": {
                "pylsp_mypy": {"enabled": True},
                "pycodestyle": {"enabled": True},
                "pyflakes": {"enabled": True},
                "pylint": {"enabled": True},
                "rope_completion": {"enabled": True},
                "jedi_completion": {
                    "enabled": True,
                    "include_params": False,  # This removes params from labels
                    "fuzzy": True,
                },
            }
        }
